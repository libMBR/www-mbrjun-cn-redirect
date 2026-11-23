# www-mbrjun-cn-redirect

Every `mbrjun.cn` hostname answers `301` to its `libmbr.com` counterpart. The project
runs on EdgeOne Pages (free plan): no server, no traffic cost.

One Pages project is bound to all `mbrjun.cn` custom domains. `middleware.js` maps the
incoming Host to the new location, so path and query survive the jump.

## Files

| File | Purpose |
|---|---|
| `middleware.js` | Host → destination map; `cos.mbrjun.cn/IMGS/*` → `lfs.libmbr.com/assets/*`; unknown subdomains fall back to `www.libmbr.com`; sets HSTS, `noindex` and a 10 minute cache on every 301 |
| `edgeone.json` | Headers only (static page), no `redirects` |
| `index.html` | Static fallback page, shown only on the project's own preview domains |
| `test-middleware.mjs` | Local checks for mappings, path/query handling and headers |
| `verify.sh` | Post-deploy check against a real hostname |

## Host map

| Host | Destination |
|---|---|
| `mbrjun.cn`, `www.mbrjun.cn`, `blog.mbrjun.cn` | `https://www.libmbr.com` |
| `ha.mbrjun.cn` | `https://aqara.libmbr.com` |
| `bw.mbrjun.cn` | `https://vault.libmbr.com` |
| `cos.mbrjun.cn` | `https://lfs.libmbr.com` (`/IMGS/*` → `/assets/*`) |
| `giscus.mbrjun.cn` | `https://hiroko.libmbr.com` |
| `key.mbrjun.cn` | `https://kira.libmbr.com/tools/passkeymanagement/` (fixed URL) |
| anything else under `*.mbrjun.cn` | `https://www.libmbr.com` |

`key.mbrjun.cn` is a breaking refactor: the new app has a different route layout, so
the old path is dropped and every request lands on the fixed URL.

## Why 301 lives in middleware, not in edgeone.json

Two measured facts:

1. `edgeone.json` `redirects` **drop the query string**;
2. `redirects` run **before** middleware — with a `/*` rule in place middleware is never
   called, which is how the query was being lost.

So middleware owns every redirect and `edgeone.json` keeps header rules for the static
page only. Middleware responses carry their own headers because the platform does not
forward `edgeone.json` headers to function responses:

```
x-robots-tag: noindex
cache-control: max-age=600
```

HSTS is enforced by EdgeOne at site level and overrides whatever the function sets:
`max-age=31536000; includeSubDomains; preload`. `mbrjun.cn` is already on the browser
preload list, so change it in the site settings, not here.

## Static fallback page

`index.html` follows the style of the `legal-unavailable` page (English first, Chinese
second, meta refresh to `www.libmbr.com`). It is never served on production hostnames:
middleware answers `301` for every path, including `/index.html`. It only renders on the
project's own preview domains (`*.edgeone.cool`, `*.edgeone.run`), because middleware
calls `next()` for hosts outside `mbrjun.cn`.

## Deploy

1. The project is linked to this repository; pushing `main` triggers a build. The output
   is `index.html`, no build command needed.
2. Bind the hostnames under Project → Domain Management (200 custom domains on the free
   plan). Minimum set: `mbrjun.cn`, `www`, `blog`, `ha`, `bw`, `cos`, `giscus`, `key`.
3. Point each DNS record at the CNAME shown by the console.
4. Purge the old cache after switching: the previous deployment answered with
   `Cache-Control: max-age=31536000`.

## Verify

```bash
node test-middleware.mjs          # local logic, no deploy needed
bash verify.sh www.mbrjun.cn      # after deploy
```

Expected:

| Request | Result |
|---|---|
| `https://mbrjun.cn/` | `301 https://www.libmbr.com/` |
| `https://www.mbrjun.cn/archives/517/?x=1` | `301 https://www.libmbr.com/archives/517/?x=1` |
| `https://ha.mbrjun.cn/lovelace/0` | `301 https://aqara.libmbr.com/lovelace/0` |
| `https://giscus.mbrjun.cn/api/discussions?repo=1` | `301 https://hiroko.libmbr.com/api/discussions?repo=1` |
| `https://key.mbrjun.cn/admin/settings` | `301 https://kira.libmbr.com/tools/passkeymanagement/` |
| `https://cos.mbrjun.cn/IMGS/a.png` | `301 https://lfs.libmbr.com/assets/a.png` |

Debug helper: append `?__host=ha.mbrjun.cn` on any bound or preview domain to exercise a
mapping; the parameter is removed from the `Location` header.

## Limits (free plan)

- 200 custom domains, 3M Edge Function executions per month, 40 projects.
- A redirect costs one function execution per request, far below the quota.
