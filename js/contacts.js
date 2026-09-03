function initContacts() {
  document.querySelectorAll('[data-tg-link]').forEach((link) => {
    link.href = TELEGRAM_URL;
  });

  document.querySelectorAll('[data-tg-username]').forEach((node) => {
    node.textContent = `@${TELEGRAM_USERNAME}`;
  });

  document.querySelectorAll('[data-phone-link]').forEach((link) => {
    link.href = PHONE_TEL;
  });

  document.querySelectorAll('[data-phone-display]').forEach((node) => {
    node.textContent = PHONE_DISPLAY;
  });

  const year = document.getElementById('year');
  if (year) {
    year.textContent = String(new Date().getFullYear());
  }
}
