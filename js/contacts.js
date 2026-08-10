function initContacts() {
  document.querySelectorAll('[data-tg-link]').forEach((link) => {
    link.href = TELEGRAM_URL;
  });

  document.querySelectorAll('[data-tg-username]').forEach((node) => {
    node.textContent = `@${TELEGRAM_USERNAME}`;
  });

  const year = document.getElementById('year');
  if (year) {
    year.textContent = String(new Date().getFullYear());
  }
}
