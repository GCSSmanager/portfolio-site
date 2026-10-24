const ASSIST_FAQ = [
  {
    q: 'Сколько это стоит?',
    a: 'Индивидуальная система — от 10.000 ₽, готовое решение из каталога — от 5.000 ₽. В эту сумму входит основа: клиенты, этапы сделок и права сотрудников. Перенос из таблиц, заявки с сайта и из рекламы, уведомления в Telegram — отдельные работы, они указаны в блоке стоимости. Точную сумму назовём после короткого разговора.',
  },
  {
    q: 'Почему нет ежемесячной оплаты?',
    a: 'Вы платите за разработку и запуск. Программа остаётся у Вас — это не аренда чужого сервиса. Если нужен сервер, его оплата идёт отдельно: это место, где программа работает, а не плата за саму CRM.',
  },
  {
    q: 'Чья будет программа?',
    a: 'Ваша. Клиенты, сделки и доступы остаются у Вас, даже если сотрудничество закончится. Мы не отключаем систему за неуплату подписки — подписки нет.',
  },
  {
    q: 'Сколько длится запуск?',
    a: 'Нужны доступы, два-три созвона и примеры, как сейчас ведёте заявки: таблица или переписка. Решение из каталога запускается быстрее, индивидуальная — после разбора Вашей работы. Всё удалённо, приезжать не нужно.',
  },
  {
    q: 'Сотрудники перейдут из мессенджера?',
    a: 'Да, если экраны совпадают с их рабочим днём, а не с чужой «правильной» схемой продаж. Запускаем на живых заявках и учим на Ваших примерах. Если неудобно — правим на запуске, а не оставляем привыкать.',
  },
  {
    q: 'Заявки с сайта попадут сами?',
    a: 'Да, это отдельная работа: обращение с сайта или из Яндекс Директа сразу в карточку клиента, а не в почту и чат. Дальше видно, кто взял заявку и на каком она этапе.',
  },
  {
    q: 'Что будет после запуска?',
    a: 'Остаёмся на связи: сбои, новые сведения в карточке, новый отчёт, изменение процесса. Свой технический сотрудник не обязателен. Если через полгода работа изменится — дорабатываем уже действующую систему, а не начинаем с нуля.',
  },
];

const ASSIST_CONTACT_REPLY =
  'Спасибо за вопрос! Мы скоро с вами свяжемся, чтобы ответить на него.';

const ASSIST_CHIPS = [
  {
    q: 'Получить бесплатно',
    label: 'Бесплатно',
    reply: 'Хорошо, оформим бесплатный пакет. Скоро свяжемся.',
  },
  {
    q: 'Заказать работу',
    label: 'Заказать',
    reply: 'Отлично! Скоро свяжемся с вами.',
  },
  { q: 'Что будет после запуска?', label: 'После запуска?' },
];

const ASSIST_OPEN_DELAY_MS = 20_000;

function normalizeAssistText(text) {
  return text.trim().toLowerCase().replace(/\s+/g, ' ');
}

function bindPhoneMask(input) {
  if (!input) return;

  input.addEventListener('focus', () => {
    if (!input.value.startsWith('+7')) {
      input.value = PHONE_PREFIX;
    }

    if (input.selectionStart < PHONE_PREFIX.length) {
      input.setSelectionRange(input.value.length, input.value.length);
    }
  });

  input.addEventListener('input', () => {
    const cursorFromEnd = input.value.length - input.selectionStart;
    input.value = formatRuPhone(input.value);
    const nextPos = Math.max(PHONE_PREFIX.length, input.value.length - cursorFromEnd);
    input.setSelectionRange(nextPos, nextPos);
    input.setCustomValidity('');
  });

  input.addEventListener('keydown', (event) => {
    const { selectionStart, selectionEnd, value } = input;

    if (selectionStart !== selectionEnd) return;

    if (event.key === 'Backspace' && selectionStart <= PHONE_PREFIX.length) {
      event.preventDefault();
      input.value = PHONE_PREFIX;
      input.setSelectionRange(PHONE_PREFIX.length, PHONE_PREFIX.length);
      return;
    }

    if (event.key === 'Delete' && selectionStart < PHONE_PREFIX.length) {
      event.preventDefault();
      input.setSelectionRange(PHONE_PREFIX.length, PHONE_PREFIX.length);
      return;
    }

    if (event.key !== 'Backspace') return;

    const charBefore = value[selectionStart - 1];
    if (charBefore === ' ' || charBefore === '-' || charBefore === '(' || charBefore === ')') {
      event.preventDefault();
      const digits = phoneDigits(value);
      input.value = formatRuPhone(digits.slice(0, -1));
      input.setSelectionRange(input.value.length, input.value.length);
    }
  });

  input.addEventListener('blur', () => {
    if (!input.value.startsWith('+7')) {
      input.value = PHONE_PREFIX;
    }
  });
}

function initCrmAssistant() {
  const root = document.querySelector('[data-assist]');
  if (!root || root.dataset.assistReady === '1') return;
  root.dataset.assistReady = '1';

  const panel = root.querySelector('[data-assist-panel]');
  const toggle = root.querySelector('[data-assist-toggle]');
  const closeBtn = root.querySelector('[data-assist-close]');
  const log = root.querySelector('[data-assist-log]');
  const composer = root.querySelector('[data-assist-composer]');
  const composerInput = root.querySelector('[data-assist-composer-input]');
  const sendBtn = root.querySelector('[data-assist-send]');

  if (!panel || !toggle || !log || !composer || !composerInput || !sendBtn) return;

  let open = false;
  let busy = false;
  let contactsShown = false;
  let contactsDone = false;
  let pendingReply = null;
  let pendingQuestion = null;
  let contactPhone = '';
  let dismissed = false;
  const asked = new Set();
  let autoTimer = null;
  let autoDue = false;
  const offerChips = ASSIST_CHIPS.map((item, index) => {
    if (index !== 0 || !document.body.dataset.assistChip) return item;
    return { q: document.body.dataset.assistChip };
  });

  function scrollLog() {
    log.scrollTop = log.scrollHeight;
  }

  function addBubble(text, role) {
    const wrap = document.createElement('div');
    wrap.className = `crm-assist__msg crm-assist__msg--${role}`;

    const bubble = document.createElement('p');
    bubble.className = 'crm-assist__bubble';
    bubble.textContent = text;
    wrap.append(bubble);
    log.append(wrap);
    scrollLog();
    return wrap;
  }

  function setComposerEnabled(enabled) {
    composerInput.disabled = !enabled;
    sendBtn.disabled = !enabled;
  }

  function markChipsAsked() {
    log.querySelectorAll('[data-assist-chip]').forEach((chip) => {
      const index = Number(chip.dataset.assistChip);
      const used = asked.has(index);
      chip.classList.toggle('is-asked', used);
      chip.disabled = used || busy || contactsShown;
    });
  }

  function findFaqAnswer(text) {
    const normalized = normalizeAssistText(text);
    const index = ASSIST_FAQ.findIndex((item) => normalizeAssistText(item.q) === normalized);
    if (index === -1) return null;
    return { item: ASSIST_FAQ[index], index };
  }

  function findChipIndex(text) {
    const normalized = normalizeAssistText(text);
    return offerChips.findIndex((item) => normalizeAssistText(item.q) === normalized);
  }

  function resolveAssistReply(text, chipIndex = -1) {
    const chip = chipIndex >= 0 ? offerChips[chipIndex] : offerChips[findChipIndex(text)];
    if (chip?.reply) return chip.reply;
    return findFaqAnswer(chip?.q || text)?.item.a || ASSIST_CONTACT_REPLY;
  }

  function showContactsCard() {
    if (contactsShown || contactsDone) return;
    contactsShown = true;
    setComposerEnabled(false);
    markChipsAsked();

    const wrap = document.createElement('div');
    wrap.className = 'crm-assist__msg crm-assist__msg--bot';

    const card = document.createElement('div');
    card.className = 'crm-assist__card';

    const title = document.createElement('p');
    title.className = 'crm-assist__card-title';
    title.textContent = 'Перед тем как продолжить, оставьте имя и телефон.';

    const form = document.createElement('form');
    form.className = 'crm-assist__card-form';

    const nameInput = document.createElement('input');
    nameInput.className = 'crm-assist__input';
    nameInput.type = 'text';
    nameInput.name = 'name';
    nameInput.autocomplete = 'name';
    nameInput.placeholder = 'Имя';

    const phoneInput = document.createElement('input');
    phoneInput.className = 'crm-assist__input';
    phoneInput.type = 'tel';
    phoneInput.name = 'phone';
    phoneInput.autocomplete = 'tel';
    phoneInput.inputMode = 'numeric';
    phoneInput.placeholder = '+7 (___) ___-__-__';

    const error = document.createElement('p');
    error.className = 'crm-assist__form-error';
    error.hidden = true;

    const submit = document.createElement('button');
    submit.className = 'crm-assist__card-submit';
    submit.type = 'submit';
    submit.textContent = 'Отправить';
    submit.disabled = true;

    const note = document.createElement('p');
    note.className = 'crm-legal-note';
    note.innerHTML =
      'Нажимая кнопку, вы соглашаетесь на <a href="/legal/consent/">обработку персональных данных</a> и с <a href="/legal/privacy/">политикой конфиденциальности</a>.';

    const syncCardSubmit = () => {
      submit.disabled = !isPhoneComplete(phoneInput.value || '');
    };

    form.append(nameInput, phoneInput, error, submit, note);
    card.append(title, form);
    wrap.append(card);
    log.append(wrap);
    scrollLog();
    bindPhoneMask(phoneInput);
    phoneInput.addEventListener('input', () => {
      phoneInput.setCustomValidity('');
      syncCardSubmit();
    });
    syncCardSubmit();
    nameInput.focus();

    form.addEventListener('submit', async (event) => {
      event.preventDefault();
      error.hidden = true;
      error.textContent = '';

      if (!isPhoneComplete(phoneInput.value || '')) {
        phoneInput.setCustomValidity('Введите номер полностью: +7 (___) ___-__-__');
        phoneInput.reportValidity();
        syncCardSubmit();
        return;
      }

      phoneInput.setCustomValidity('');
      const name = nameInput.value.trim() || 'Заявка из чата';
      const phone = phoneInput.value;
      const reply = pendingReply || ASSIST_CONTACT_REPLY;
      const question = pendingQuestion || '';

      submit.disabled = true;

      try {
        await window.sendCrmLead({
          name,
          phone,
          source: 'crm-assist',
          message: question,
        });
        if (typeof window.ym === 'function') {
          window.ym(112716152, 'reachGoal', 'crm-chat');
        }
      } catch (err) {
        error.textContent =
          err?.message || window.getLeadErrorMessage?.('unknown') || 'Не удалось отправить заявку.';
        error.hidden = false;
        syncCardSubmit();
        return;
      }

      contactsDone = true;
      contactsShown = false;
      contactPhone = phone;
      pendingReply = null;
      pendingQuestion = null;
      wrap.remove();

      const displayName = nameInput.value.trim();
      addBubble(displayName ? `${displayName}, ${phone}` : phone, 'user');

      window.setTimeout(() => {
        addBubble(reply, 'bot');
        setComposerEnabled(true);
        markChipsAsked();
      }, 320);
    });
  }

  function answerQuestion(question, chipIndex = -1) {
    if (busy || contactsShown) return;

    const text = question.trim();
    if (!text) return;

    const index = chipIndex >= 0 ? chipIndex : findChipIndex(text);
    const reply = resolveAssistReply(text, index);

    addBubble(text, 'user');

    if (index >= 0) asked.add(index);

    pendingReply = reply;
    pendingQuestion = text;
    markChipsAsked();

    if (!contactsDone) {
      window.setTimeout(showContactsCard, 280);
      return;
    }

    busy = true;
    setComposerEnabled(false);

    window.sendCrmChat?.({
      phone: contactPhone,
      message: text,
    }).catch(() => {});

    window.setTimeout(() => {
      addBubble(reply, 'bot');
      busy = false;
      pendingReply = null;
      pendingQuestion = null;
      setComposerEnabled(true);
      markChipsAsked();
    }, 420);
  }

  function seedChat() {
    const greet = document.createElement('div');
    greet.className = 'crm-assist__msg crm-assist__msg--bot';

    const bubble = document.createElement('p');
    bubble.className = 'crm-assist__bubble';
    bubble.textContent = 'Здравствуйте! Выберите вопрос или напишите свой.';

    const chips = document.createElement('div');
    chips.className = 'crm-assist__chips';

    offerChips.forEach((item, index) => {
      const chip = document.createElement('button');
      chip.type = 'button';
      chip.className = 'crm-assist__chip';
      chip.dataset.assistChip = String(index);
      chip.textContent = item.label || item.q;
      chip.addEventListener('click', () => answerQuestion(item.q, index));
      chips.append(chip);
    });

    greet.append(bubble, chips);
    log.append(greet);
  }

  function isModalOpen() {
    return document.body.classList.contains('is-modal-open');
  }

  function openPanel() {
    if (isModalOpen()) return;

    open = true;
    dismissed = false;
    root.classList.add('is-open');
    panel.hidden = false;
    toggle.setAttribute('aria-expanded', 'true');
    toggle.setAttribute('aria-label', 'Закрыть ассистента');

    if (!contactsShown) {
      composerInput.focus();
    }
  }

  function closePanel(options = {}) {
    open = false;
    if (options.dismiss !== false) dismissed = true;
    root.classList.remove('is-open');
    panel.hidden = true;
    toggle.setAttribute('aria-expanded', 'false');
    toggle.setAttribute('aria-label', 'Открыть ассистента');
  }

  function tryAutoOpen() {
    if (!autoDue || dismissed || open || isModalOpen()) return;
    openPanel();
  }

  toggle.addEventListener('click', () => {
    if (isModalOpen()) return;
    if (open) closePanel();
    else openPanel();
  });

  closeBtn?.addEventListener('click', closePanel);

  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && open && !isModalOpen()) closePanel();
  });

  composer.addEventListener('submit', (event) => {
    event.preventDefault();
    const value = composerInput.value;
    composerInput.value = '';
    answerQuestion(value);
  });

  seedChat();

  autoTimer = window.setTimeout(() => {
    autoDue = true;
    tryAutoOpen();
  }, ASSIST_OPEN_DELAY_MS);

  const modalWatch = new MutationObserver(() => {
    if (isModalOpen()) {
      if (open) closePanel({ dismiss: false });
      return;
    }
    tryAutoOpen();
  });
  modalWatch.observe(document.body, { attributes: true, attributeFilter: ['class'] });

  window.addEventListener(
    'beforeunload',
    () => {
      if (autoTimer) window.clearTimeout(autoTimer);
      modalWatch.disconnect();
    },
    { once: true }
  );
}

const FREE_FAQ_ANSWERS = {
  'Сколько это стоит?': 'Сама программа бесплатная. Подходит магазину, услугам и записи клиентов. Запуск онлайн, из любого города.',
  'Почему нет ежемесячной оплаты?': 'Программа Ваша. Нет аренды чужого сервиса и нет ежемесячного платежа за саму CRM.',
  'Чья будет программа?': 'Ваша. Клиенты и сделки остаются у Вас. Мы не забираем доступ и не привязываем работу к подписке.',
  'Сколько длится запуск?': 'Запуск онлайн: доступы, короткий созвон и перенос того, как Вы сейчас ведёте заявки. Приезжать не нужно, город не важен.',
};

function renderGuideFaq() {
  const root = document.querySelector('[data-guide-faq]');
  if (!root) return;

  const answers = root.dataset.faqVariant === 'free' ? FREE_FAQ_ANSWERS : null;

  root.replaceChildren();

  ASSIST_FAQ.forEach((item) => {
    const details = document.createElement('details');
    details.className = 'crm-guide__item';

    const summary = document.createElement('summary');
    summary.className = 'crm-guide__q';
    summary.textContent = item.q;

    const answer = document.createElement('p');
    answer.className = 'crm-guide__a';
    answer.textContent = answers?.[item.q] || item.a;

    details.append(summary, answer);
    root.append(details);
  });
}
