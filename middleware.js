// EdgeOne Pages middleware — one project serves every mbrjun.cn hostname and answers
// with a 301 to its libmbr.com counterpart. Path and query are preserved unless the
// host maps to a fixed URL (see FIXED_TARGETS).
const DEFAULT_TARGET = 'https://www.libmbr.com';

const TARGETS = {
  'mbrjun.cn': DEFAULT_TARGET,
  'www.mbrjun.cn': DEFAULT_TARGET,
  'blog.mbrjun.cn': DEFAULT_TARGET,

  // Services that moved to their own hostnames.
  'ha.mbrjun.cn': 'https://aqara.libmbr.com',
  'bw.mbrjun.cn': 'https://vault.libmbr.com',
  'cos.mbrjun.cn': 'https://lfs.libmbr.com',
  'giscus.mbrjun.cn': 'https://hiroko.libmbr.com',
};

// Destinations with a different route layout: the old path is dropped on purpose.
const FIXED_TARGETS = {
  'key.mbrjun.cn': 'https://kira.libmbr.com/tools/passkeymanagement/',
};

// The platform does not forward edgeone.json headers to middleware responses,
// so they are set here explicitly.
const RESPONSE_HEADERS = {
  'strict-transport-security': 'max-age=63072000; includeSubDomains; preload',
  'x-robots-tag': 'noindex',
  'cache-control': 'max-age=600',
};

const APEX = 'mbrjun.cn';

function moved(location, redirect) {
  const res = redirect(location, 301);
  const headers = new Headers(res.headers);
  for (const [name, value] of Object.entries(RESPONSE_HEADERS)) headers.set(name, value);
  return new Response(null, { status: 301, headers });
}

export function middleware(context) {
  const { request, next, redirect } = context;
  const url = new URL(request.url);

  // `__host` lets you exercise a mapping on a preview domain; it is stripped from Location.
  const debugHost = url.searchParams.get('__host');
  const host = (debugHost || url.hostname).toLowerCase();
  if (host !== APEX && !host.endsWith('.' + APEX)) return next();

  let search = url.search;
  if (debugHost) {
    const rest = new URLSearchParams(url.searchParams);
    rest.delete('__host');
    const qs = rest.toString();
    search = qs ? '?' + qs : '';
  }

  const fixed = FIXED_TARGETS[host];
  if (fixed) return moved(fixed, redirect);

  // Legacy image paths: cos.mbrjun.cn/IMGS/x -> lfs.libmbr.com/assets/x
  if (host === 'cos.mbrjun.cn' && url.pathname.startsWith('/IMGS/')) {
    return moved(
      'https://lfs.libmbr.com/assets/' + url.pathname.slice('/IMGS/'.length) + search,
      redirect
    );
  }

  const target = TARGETS[host] || DEFAULT_TARGET;
  return moved(target + url.pathname + search, redirect);
}
