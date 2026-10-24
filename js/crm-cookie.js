function initCrmCookieBanner() {
  const banner = document.querySelector('[data-cookie-banner]');
  if (!banner) return;

  const key = 'gcss-cookie-ok';
  try {
    if (localStorage.getItem(key)) return;
  } catch {
    /* show banner */
  }

  banner.hidden = false;

  const accept = banner.querySelector('[data-cookie-accept]');
  if (!accept) return;

  accept.addEventListener('click', () => {
    try {
      localStorage.setItem(key, '1');
    } catch {
      /* ignore */
    }
    banner.hidden = true;
  });
}
