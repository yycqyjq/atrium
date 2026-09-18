import { promises as fs } from "node:fs";
import path from "node:path";

/**
 * 两级缓存（内存 + 磁盘 JSON），项目内置、零服务依赖：
 * - 读：内存 → 磁盘 → 回源；回源失败时端出旧数据（哪怕过期），页面不开天窗
 * - 自然过期（TTL 到点、未经写失效）：立即端出旧数据，后台悄悄刷新（stale-while-revalidate），
 *   避免切页面时被整轮回源的耗时卡住；写操作后的失效（水位抬高）与 force 仍阻塞重取，
 *   保证「发布后立刻可见」。
 * - 写：原子落盘（临时文件 + rename），崩溃不产生坏文件
 * - 并发防抖：同一键同时只发起一次回源
 * - 失效：invalidateCache(key) / invalidateCachePrefix(prefix)（写操作后调用）
 *
 * 目录：<数据目录>/cache/*.json（与 config.json 同级，桌面版/网页版自动适配）
 *
 * ⚠️ 内存状态必须挂在 globalThis（见 getStore）：
 * Next.js 会把本模块分别打包进多个 server chunk（页面 / 路由处理 / SSR 各一份），
 * 模块作用域的 Map 因此存在多份互不相通的副本。写接口调用失效时清掉的是自己那一份，
 * 页面读到的仍是另一份里的旧数据 —— 表现为「发布后列表不刷新」。
 * 挂到 globalThis 后，同一进程内所有 chunk 共享同一份内存缓存与失效水位。
 */

const DATA_DIR = process.env.ATRIUM_DATA_DIR || path.join(process.cwd(), "data");
const CACHE_DIR = path.join(DATA_DIR, "cache");

type Envelope<T> = { at: number; value: T };

type CacheStore = {
  mem: Map<string, Envelope<unknown>>;
  inflight: Map<string, Promise<unknown>>;
  /** key 或 prefix → 最近一次失效时刻；早于它的缓存条目一律视为过期 */
  invalidated: Map<string, number>;
};

const STORE_KEY = "__atriumCacheStore__";

function getStore(): CacheStore {
  const g = globalThis as typeof globalThis & { [STORE_KEY]?: CacheStore };
  if (g[STORE_KEY]) return g[STORE_KEY];
  const created: CacheStore = {
    mem: new Map(),
    inflight: new Map(),
    invalidated: new Map(),
  };
  g[STORE_KEY] = created;
  return created;
}

const store = getStore();

function filePathFor(key: string) {
  return path.join(CACHE_DIR, `${key.replace(/[^a-zA-Z0-9._-]/g, "_")}.json`);
}

/** 该 key 的失效水位：所有匹配前缀中最晚的一次失效时刻（无则 0） */
function invalidationFloor(key: string): number {
  let floor = 0;
  for (const [prefix, at] of store.invalidated) {
    if (at > floor && key.startsWith(prefix)) floor = at;
  }
  return floor;
}

async function readDisk<T>(key: string): Promise<Envelope<T> | null> {
  try {
    const raw = await fs.readFile(filePathFor(key), "utf8");
    const data = JSON.parse(raw) as Envelope<T>;
    if (typeof data?.at !== "number" || !("value" in data)) return null;
    return data;
  } catch {
    return null;
  }
}

async function writeDisk<T>(key: string, env: Envelope<T>) {
  try {
    await fs.mkdir(CACHE_DIR, { recursive: true });
    const target = filePathFor(key);
    const tmp = `${target}.tmp-${process.pid}-${Date.now()}`;
    await fs.writeFile(tmp, JSON.stringify(env), "utf8");
    await fs.rename(tmp, target);
  } catch (err) {
    console.warn("[cache] 落盘失败：", err instanceof Error ? err.message : err);
  }
}

export type CacheResult<T> = { value: T; stale: boolean };

export async function cacheThrough<T>(
  key: string,
  ttl: number,
  fetcher: () => Promise<T>,
  opts: {
    /** 强制刷新（跳过新鲜度检查，仍写入缓存） */
    force?: boolean;
    /** 结果是否允许缓存/覆盖旧值（false 时端旧数据；无旧数据则原样返回） */
    shouldCache?: (value: T) => boolean;
    /** 命中该判断的错误直接抛出、不端旧数据（如「未配置」） */
    hardError?: (err: unknown) => boolean;
    /** 结果可疑（如意外为空）时沿用旧数据且不覆盖 */
    suspicious?: (value: T, previous: T | null) => boolean;
  } = {},
): Promise<CacheResult<T>> {
  // 失效水位：早于它的条目（内存或磁盘）都不算数，必须回源
  const floor = invalidationFloor(key);
  const memHit = store.mem.get(key) as Envelope<T> | undefined;
  const memUsable = !!memHit && memHit.at >= floor;
  let previous: T | null = memHit?.value ?? null;
  // SWR 快照：过期但未经写失效的可用数据，可先端出去、后台再刷
  let swrSnap: Envelope<T> | null = memUsable && memHit ? memHit : null;

  if (!opts.force && memUsable && memHit && Date.now() - memHit.at < ttl) {
    return { value: memHit.value, stale: false };
  }

  if (!memUsable || opts.force) {
    const disk = await readDisk<T>(key);
    if (disk) {
      if (disk.at >= floor) {
        if (!memHit) store.mem.set(key, disk);
        if (previous == null || opts.force) previous = disk.value;
        if (!opts.force) {
          if (Date.now() - disk.at < ttl) return { value: disk.value, stale: false };
          if (!swrSnap) swrSnap = disk;
        }
      } else if (previous == null) {
        // 已失效的旧条目：不能直接返回，但仍可作为回源失败时的兜底
        previous = disk.value;
      }
    }
  }

  const running = store.inflight.get(key) as Promise<CacheResult<T>> | undefined;
  const work: Promise<CacheResult<T>> =
    running ??
    (async (): Promise<CacheResult<T>> => {
      try {
        console.log("[cache] 回源", key);
        const value = await fetcher();
        if (opts.shouldCache && !opts.shouldCache(value)) {
          return previous != null ? { value: previous, stale: true } : { value, stale: false };
        }
        if (previous != null && opts.suspicious?.(value, previous)) {
          console.warn(`[cache] ${key} 结果可疑（疑似为空），沿用旧数据`);
          return { value: previous, stale: true };
        }
        const env: Envelope<T> = { at: Date.now(), value };
        store.mem.set(key, env);
        await writeDisk(key, env);
        return { value, stale: false };
      } catch (err) {
        if (opts.hardError?.(err)) throw err;
        if (previous != null) {
          console.warn(`[cache] ${key} 回源失败，端出旧数据：`, err instanceof Error ? err.message : err);
          return { value: previous, stale: true };
        }
        throw err;
      } finally {
        store.inflight.delete(key);
      }
    })();
  if (!running) store.inflight.set(key, work);

  // 自然过期且手上有旧数据：先端出去，刷新在后台继续
  if (!opts.force && swrSnap) {
    work.catch(() => {
      /* 失败兜底已在 work 内部处理，这里只防后台任务惊动 unhandled rejection */
    });
    return { value: swrSnap.value, stale: true };
  }
  return work;
}

/**
 * 失效：抬高失效水位（所有 chunk 立刻可见），并删除内存与磁盘条目。
 * 即使磁盘删除失败或被别的进程重新写回，水位也会让旧条目失效。
 */
export async function invalidateCache(key: string) {
  store.invalidated.set(key, Date.now());
  store.mem.delete(key);
  try {
    await fs.unlink(filePathFor(key));
  } catch {
    /* 不存在即忽略 */
  }
}

/** 按前缀失效（如 content-）：水位、内存、磁盘一起处理 */
export async function invalidateCachePrefix(prefix: string) {
  store.invalidated.set(prefix, Date.now());
  for (const key of [...store.mem.keys()]) {
    if (key.startsWith(prefix)) store.mem.delete(key);
  }
  const safePrefix = prefix.replace(/[^a-zA-Z0-9._-]/g, "_");
  try {
    const files = await fs.readdir(CACHE_DIR);
    await Promise.all(
      files
        .filter((name) => name.startsWith(safePrefix))
        .map((name) => fs.unlink(path.join(CACHE_DIR, name)).catch(() => {})),
    );
  } catch {
    /* 目录不存在即忽略 */
  }
}
