// Инициализация контактов
function initContacts() {
    const telegramUsername = document.getElementById('telegramUsername');
    const footerTelegramUsername = document.getElementById('footerTelegramUsername');
    const telegramLink = document.getElementById('telegramLink');
    const footerTelegramLink = document.getElementById('footerTelegramLink');

    const telegramContact = '@GCSSmanager';
    const telegramUrl = `https://t.me/${telegramContact.replace('@', '')}`;

    if (telegramUsername) {
        telegramUsername.textContent = telegramContact;
    }

    if (footerTelegramUsername) {
        footerTelegramUsername.textContent = telegramContact;
    }

    if (telegramLink) {
        telegramLink.href = telegramUrl;
    }

    if (footerTelegramLink) {
        footerTelegramLink.href = telegramUrl;
    }
}

