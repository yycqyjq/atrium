import { promises as fs } from "node:fs";
import path from "node:path";

/**
 * 两级缓存（内存 + 磁盘 JSON），项目内置、零服务依赖：
 * - 读：内存 → 磁盘 → 回源；回源失败时端出旧数据（哪怕过期），页面不开天窗
 * - 写：原子落盘（临时文件 + rename），崩溃不产生坏文件
 * - 并发防抖：同一键同时只发起一次回源
 * - 失效：invalidateCache(key) / invalidateCachePrefix(prefix)（写操作后调用）
 *
 * 目录：<数据目录>/cache/*.json（与 config.json 同级，桌面版/网页版自动适配）
 */

const DATA_DIR = process.env.ATRIUM_DATA_DIR || path.join(process.cwd(), "data");
const CACHE_DIR = path.join(DATA_DIR, "cache");

type Envelope<T> = { at: number; value: T };

const mem = new Map<string, Envelope<unknown>>();
const inflight = new Map<string, Promise<unknown>>();

function filePathFor(key: string) {
  return path.join(CACHE_DIR, `${key.replace(/[^a-zA-Z0-9._-]/g, "_")}.json`);
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
  const memHit = mem.get(key) as Envelope<T> | undefined;
  let previous: T | null = memHit?.value ?? null;

  if (!opts.force && memHit && Date.now() - memHit.at < ttl) {
    return { value: memHit.value, stale: false };
  }

  if (!memHit || opts.force) {
    const disk = await readDisk<T>(key);
    if (disk) {
      if (!memHit) mem.set(key, disk);
      if (previous == null || opts.force) previous = disk.value;
      if (!opts.force && Date.now() - disk.at < ttl) return { value: disk.value, stale: false };
    }
  }

  const running = inflight.get(key) as Promise<CacheResult<T>> | undefined;
  if (running) return running;

  const work = (async (): Promise<CacheResult<T>> => {
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
      mem.set(key, env);
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
      inflight.delete(key);
    }
  })();
  inflight.set(key, work);
  return work;
}

/** 失效：删除内存与磁盘条目 */
export async function invalidateCache(key: string) {
  mem.delete(key);
  try {
    await fs.unlink(filePathFor(key));
  } catch {
    /* 不存在即忽略 */
  }
}

/** 按前缀失效（如 content-） */
export async function invalidateCachePrefix(prefix: string) {
  for (const key of [...mem.keys()]) {
    if (key.startsWith(prefix)) mem.delete(key);
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
