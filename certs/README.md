# certs（本机证书目录，内容不进 git）

如果你在 Mac 上使用 **Watt Toolkit（Steam++ / 瓦特工具箱）** 等对 GitHub 做「加速」的工具，
它会用自签根证书拦截 GitHub 流量；Node 默认不信任它，会导致中庭抓取仓库失败
（报错特征：`UNABLE_TO_VERIFY_LEAF_SIGNATURE`）。curl / 浏览器走系统钥匙串，所以不受影响。

把它的根证书导出到本目录：

```bash
security find-certificate -a -c "SteamTools" -p /Library/Keychains/System.keychain > certs/watt-toolkit.pem 2>/dev/null
security find-certificate -a -c "SteamTools" -p "$HOME/Library/Keychains/login.keychain-db" >> certs/watt-toolkit.pem 2>/dev/null
```

然后使用带证书的启动命令：

```bash
pnpm dev:cert     # 开发
pnpm start:cert   # 生产（先 pnpm build）
```

说明：

- 该证书是公开证书（非私钥），但仍建议留在本机、不进 git；
- Gitee 等未被拦截的域名不需要此文件；
- 其他对 GitHub 做代理的工具（公司网络证书等）同理：把它们对应的根证书导出为 PEM，指向 `NODE_EXTRA_CA_CERTS` 即可。
