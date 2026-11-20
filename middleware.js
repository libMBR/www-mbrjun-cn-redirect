// EdgeOne Pages Middleware — 单项目承接 mbrjun.cn 全站，301 到 libmbr.com 对应站点。
// 路径与 query 原样保留；未在表中列出的 mbrjun.cn 子域统一落 www.libmbr.com。
const DEFAULT_TARGET = 'https://www.libmbr.com';

const TARGETS = {
  'mbrjun.cn': DEFAULT_TARGET,
  'www.mbrjun.cn': DEFAULT_TARGET,
  'blog.mbrjun.cn': DEFAULT_TARGET,

  // 仍在使用的服务
  'ha.mbrjun.cn': 'https://ha.libmbr.com',
  'bw.mbrjun.cn': 'https://vault.libmbr.com',
  'cos.mbrjun.cn': 'https://lfs.libmbr.com',
};

const APEX = 'mbrjun.cn';

export function middleware(context) {
  const { request, next, redirect } = context;
  const url = new URL(request.url);

  // 调试用：预览域上带 ?__host=ha.mbrjun.cn 可验证映射；该参数不会带进 Location
  const debugHost = url.searchParams.get('__host');
  const host = (debugHost || url.hostname).toLowerCase();
  if (host !== APEX && !host.endsWith('.' + APEX)) return next();

  let search = url.search;
  if (debugHost) {
    const rest = new URLSearchParams(url.searchParams);
    rest.delete('__host');
    const s = rest.toString();
    search = s ? '?' + s : '';
  }

  // 历史图床路径 cos.mbrjun.cn/IMGS/x -> lfs.libmbr.com/assets/x
  if (host === 'cos.mbrjun.cn' && url.pathname.startsWith('/IMGS/')) {
    return redirect(
      'https://lfs.libmbr.com/assets/' + url.pathname.slice('/IMGS/'.length) + search,
      301
    );
  }

  const target = TARGETS[host] || DEFAULT_TARGET;
  return redirect(target + url.pathname + search, 301);
}
