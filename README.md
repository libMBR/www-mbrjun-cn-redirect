# www-mbrjun-cn-redirect

`mbrjun.cn` 全站 301 到 `libmbr.com`，由 EdgeOne Pages 免费版承接（无服务器、无流量费）。

一个项目绑定全部 `mbrjun.cn` 自定义域名，靠 `middleware.js` 按 Host 分流，路径与 query 原样保留。

## 目录

| 文件 | 作用 |
|---|---|
| `middleware.js` | 按 Host 映射 301 目标；`cos.mbrjun.cn/IMGS/*` → `lfs.libmbr.com/assets/*`；未知子域回落到 `www.libmbr.com` |
| `edgeone.json` | 只保留响应头（HSTS、`Cache-Control: max-age=600`、`noindex`）；不含 redirects |
| `index.html` | 最后兜底页（middleware 失效时 meta refresh 到 `www.libmbr.com`） |
| `test-middleware.mjs` | 本地单测，校验 Host→目标映射与 path/query 保留 |

## 为什么不把 301 写在 edgeone.json

实测两条结论：

1. `edgeone.json` 的 `redirects` **会丢弃 query string**；
2. **redirects 的执行顺序在 middleware 之前** —— 存在 `/*` 规则时，middleware 根本不会被调用（`?x=1` 被吞就是这个原因）。

所以 301 全部交给 `middleware.js`：它按 Host 分流，并用 `pathname + search` 保留原始路径与 query。`edgeone.json` 里只留 header 规则。

调试：预览域或任意已绑定域名上带 `?__host=ha.mbrjun.cn` 可验证映射（该参数不会带进 Location）。

## 部署

### 1. 项目已关联本仓库

推送 `main` 即触发构建。产物就是 `index.html`，无需构建命令。

### 2. 绑定域名（控制台 → 项目 → 域名管理 → 添加自定义域名）

每个要接管的域名都加进来，总共免费版上限 200 个。当前应绑定：

```
mbrjun.cn
www.mbrjun.cn
blog.mbrjun.cn
ha.mbrjun.cn
bw.mbrjun.cn
cos.mbrjun.cn
```

其余历史子域（`hk` `kas` `arctanmai` `delightful` `delta` `qqlogin` `devfile` `api` `key` `kernel` `download` `hybot` `avatar` `a5cd…-srv` `moe` 等）按需添加；只要 Host 落在 `*.mbrjun.cn`，未配置的会统一 301 到 `www.libmbr.com`。

### 3. 改 DNS（DNSPod）

每个域名把 CNAME 指向控制台给出的本项目 CNAME（形如 `<hash>.<domain>.dnsoe2.com`）。

现有记录是旧项目 `d4e206e9.www.mbrjun.cn.dnsoe2.com` / `9d66e26d.blog.mbrjun.cn.dnsoe2.com`，改成新项目的值即可。

### 4. 清缓存

旧响应带 `Cache-Control: max-age=31536000`，切换后要在 EdgeOne 控制台清一次缓存，否则回访用户还会吃一年的 200 占位页。

## 验收

```bash
# 本地逻辑（不需要部署）
node test-middleware.mjs

# 部署后
bash verify.sh www.mbrjun.cn

```

预期：

| 请求 | 结果 |
|---|---|
| `https://mbrjun.cn/` | `301 https://www.libmbr.com/` |
| `https://www.mbrjun.cn/archives/520/?x=1` | `301 https://www.libmbr.com/archives/520/?x=1` |
| `https://blog.mbrjun.cn/post/1` | `301 https://www.libmbr.com/post/1` |
| `https://ha.mbrjun.cn/lovelace/0` | `301 https://ha.libmbr.com/lovelace/0` |
| `https://bw.mbrjun.cn/` | `301 https://vault.libmbr.com/` |
| `https://cos.mbrjun.cn/IMGS/a.png` | `301 https://lfs.libmbr.com/assets/a.png` |

## 额度（免费版）

- 自定义域名 200 个 / Edge Functions 300 万次执行每月 / 项目 40 个
- 纯 301 场景每个请求 1 次函数执行，远低于配额
