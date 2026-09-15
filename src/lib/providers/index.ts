import { defaultProviderKey } from "@/lib/config";
import { giteeProvider } from "./gitee";
import { githubProvider } from "./github";
import { PROVIDER_KEYS, isProviderKey, type ProviderKey, type RepoProvider } from "./types";

export { PROVIDER_KEYS, isProviderKey };
export type { ProviderKey, RepoProvider };

const FACTORIES: Record<ProviderKey, () => Promise<RepoProvider>> = {
  github: githubProvider,
  gitee: giteeProvider,
};

/** 取内容源实例：传 key 指定，缺省用配置里的 defaultProvider */
export async function getProvider(key?: string): Promise<RepoProvider> {
  const resolved: ProviderKey = isProviderKey(key) ? key : await defaultProviderKey();
  return FACTORIES[resolved]();
}

/** 内容源清单（含配置状态），供 /api/providers 与未来设置页使用 */
export async function getProviderList() {
  const list: Array<{ key: ProviderKey; label: string; configured: boolean }> = [];
  for (const key of PROVIDER_KEYS) {
    const provider = await FACTORIES[key]();
    list.push({ key, label: provider.label, configured: await provider.isConfigured() });
  }
  return list;
}
