/** Ссылка назад на страницу, с которой открыли демо (тот же сайт). */
const BACK_KEY = "clinic-demo.back";

function isDemoPath(pathname: string) {
  return pathname.startsWith("/crm/demo/clinic");
}

function sameOriginPath(href: string): string | null {
  try {
    const url = new URL(href, window.location.origin);
    if (url.origin !== window.location.origin) return null;
    if (isDemoPath(url.pathname)) return null;
    return `${url.pathname}${url.search}${url.hash}` || "/crm/free/";
  } catch {
    return null;
  }
}

/** Запоминаем opener при первом заходе (referrer / ?from=), чтобы hash-навигация не сбила. */
function captureOpener() {
  try {
    const params = new URLSearchParams(window.location.search);
    const fromParam = params.get("from");
    if (fromParam) {
      const path = sameOriginPath(fromParam.startsWith("/") ? fromParam : `/${fromParam}`);
      if (path) {
        sessionStorage.setItem(BACK_KEY, path);
        return;
      }
    }

    if (sessionStorage.getItem(BACK_KEY)) return;

    const fromReferrer = sameOriginPath(document.referrer);
    if (fromReferrer) sessionStorage.setItem(BACK_KEY, fromReferrer);
  } catch {
    /* ignore */
  }
}

export function siteBackHref() {
  captureOpener();
  try {
    const saved = sessionStorage.getItem(BACK_KEY);
    if (saved) return saved;
  } catch {
    /* ignore */
  }
  return "/crm/free/";
}
