// Local checks for the middleware host map, path/query handling and response headers.
// Run with: node test-middleware.mjs
import fs from 'node:fs';

const src = fs.readFileSync(new URL('./middleware.js', import.meta.url), 'utf8')
  .replace(/export\s*\{[^}]*\};?/g, '')
  .replace(/export\s+function\s+middleware/, 'function middleware');

const middleware = new Function(`${src}; return middleware;`)();

function call(url) {
  const context = {
    request: new Request(url),
    next: () => ({ kind: 'next' }),
    redirect: (dest, status) => new Response(null, { status, headers: { location: dest } }),
  };
  const r = middleware(context);
  if (r && r.kind === 'next') return { next: true };
  return {
    status: r.status,
    location: r.headers.get('location') || '',
    hsts: r.headers.get('strict-transport-security') || '',
    robots: r.headers.get('x-robots-tag') || '',
    cache: r.headers.get('cache-control') || '',
  };
}

const cases = [
  ['https://mbrjun.cn/', 'https://www.libmbr.com/'],
  ['https://mbrjun.cn/archives/520/?x=1', 'https://www.libmbr.com/archives/520/?x=1'],
  ['https://www.mbrjun.cn/archives/517/', 'https://www.libmbr.com/archives/517/'],
  ['https://www.mbrjun.cn/assets/css/style.min.css', 'https://www.libmbr.com/assets/css/style.min.css'],
  ['https://blog.mbrjun.cn/post/1?x=1', 'https://www.libmbr.com/post/1?x=1'],

  ['https://ha.mbrjun.cn/lovelace/0', 'https://aqara.libmbr.com/lovelace/0'],
  ['https://bw.mbrjun.cn/', 'https://vault.libmbr.com/'],
  ['https://giscus.mbrjun.cn/api/discussions?repo=1', 'https://hiroko.libmbr.com/api/discussions?repo=1'],
  ['https://cos.mbrjun.cn/IMGS/a.png?v=2', 'https://lfs.libmbr.com/assets/a.png?v=2'],
  ['https://cos.mbrjun.cn/other/x', 'https://lfs.libmbr.com/other/x'],

  // key is a breaking refactor: path is dropped, fixed destination only
  ['https://key.mbrjun.cn/', 'https://kira.libmbr.com/tools/passkeymanagement/'],
  ['https://key.mbrjun.cn/admin/settings?tab=keys', 'https://kira.libmbr.com/tools/passkeymanagement/'],

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
    : got.status === 301 && got.location === expect && got.hsts.includes('max-age=63072000');
  if (!ok) fail++;
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${url}`);
  if (!ok) console.log(`      got ${got.next ? 'next()' : got.status + ' ' + got.location}`);
}
console.log(`\n${cases.length - fail}/${cases.length} passed`);
process.exit(fail ? 1 : 0);
