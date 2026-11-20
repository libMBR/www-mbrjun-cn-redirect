// 本地验证 middleware 的 host->目标映射与 path/query 保留。
// 用法：node test-middleware.mjs
import fs from 'node:fs';

const src = fs.readFileSync(new URL('./middleware.js', import.meta.url), 'utf8')
  .replace(/export\s*\{[^}]*\};?/g, '')
  .replace(/export\s+function\s+middleware/, 'function middleware');

const factory = new Function(`${src}; return middleware;`);
const middleware = factory();

function call(url) {
  let result;
  const context = {
    request: new Request(url),
    next: () => ({ kind: 'next' }),
    redirect: (dest, status) => { result = { status, location: dest }; return result; },
  };
  const r = middleware(context);
  return result || (r && r.kind === 'next' ? { next: true } : r);
}

const cases = [
  // [url, expected]
  ['https://mbrjun.cn/', 'https://www.libmbr.com/'],
  ['https://mbrjun.cn/archives/520/?x=1', 'https://www.libmbr.com/archives/520/?x=1'],
  ['https://www.mbrjun.cn/archives/520/', 'https://www.libmbr.com/archives/520/'],
  ['https://www.mbrjun.cn/assets/css/style.min.css', 'https://www.libmbr.com/assets/css/style.min.css'],
  ['https://blog.mbrjun.cn/post/1?x=1', 'https://www.libmbr.com/post/1?x=1'],
  ['https://ha.mbrjun.cn/lovelace/0', 'https://ha.libmbr.com/lovelace/0'],
  ['https://bw.mbrjun.cn/', 'https://vault.libmbr.com/'],
  ['https://cos.mbrjun.cn/IMGS/a.png', 'https://lfs.libmbr.com/assets/a.png'],
  ['https://cos.mbrjun.cn/IMGS/a.png?v=2', 'https://lfs.libmbr.com/assets/a.png?v=2'],
  ['https://cos.mbrjun.cn/other/x', 'https://lfs.libmbr.com/other/x'],
  ['https://hk.mbrjun.cn/', 'https://www.libmbr.com/'],
  ['https://moe.mbrjun.cn/x?y=1', 'https://www.libmbr.com/x?y=1'],
  ['https://unknown.mbrjun.cn/a/b', 'https://www.libmbr.com/a/b'],
  ['https://www.libmbr.com/', { next: true }],
  ['https://evil.mbrjun.cn.attacker.tld/', { next: true }],
  ['https://preview.pages.dnsoe6.com/?__host=blog.mbrjun.cn', 'https://www.libmbr.com/'],
];

let fail = 0;
for (const [url, expect] of cases) {
  const got = call(url);
  const ok = expect.next
    ? got.next === true
    : got.status === 301 && got.location === expect;
  if (!ok) fail++;
  const shown = got.next ? 'next()' : `${got.status} ${got.location}`;
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${url}\n      -> ${shown}${ok ? '' : `\n      want 301 ${expect}`}`);
}
console.log(`\n${cases.length - fail}/${cases.length} passed`);
process.exit(fail ? 1 : 0);
