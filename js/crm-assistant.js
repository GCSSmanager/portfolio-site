const ASSIST_FAQ = [
  {
    q: 'Кому нужна CRM?',
    a: 'Если заявки, запись клиентов или склад ведутся в таблицах и мессенджерах — и из‑за этого теряются деньги — CRM как раз для вас. Особенно когда в работе уже несколько человек.',
  },
  {
    q: 'Как выбрать CRM?',
    a: 'Смотрите не на длинный список функций, а на Ваши процессы: заявки, запись, склад, отчёты. Система должна повторять Ваш день, а не заставлять ломать привычную работу.',
  },
  {
    q: 'На что обратить внимание?',
    a: 'На запуск под ключ, обучение сотрудников и поддержку после сдачи. Важно, чтобы система осталась Вашей — без ежемесячной аренды платформы — и чтобы подрядчик не пропал после оплаты.',
  },
  {
    q: 'Что значит «под ключ»?',
    a: 'Мы берём задачу целиком: разбираем процессы, собираем систему, запускаем и обучаем сотрудников. Вы получаете готовую рабочую программу, а не набор файлов «разберитесь сами».',
  },
  {
    q: 'Нужно ли быть в Москве?',
    a: 'Нет. Установка и запуск проходят онлайн — из любого города. Согласуем доступы, настроим систему и обучим сотрудников удалённо.',
  },
  {
    q: 'Сколько это стоит?',
    a: 'Готовые платформы — от 5 000 ₽, решения из каталога — от 15 000 ₽, индивидуальная система — от 30 000 ₽. Точную сумму назовём после короткой консультации.',
  },
  {
    q: 'Что будет после запуска?',
    a: 'Бессрочная поддержка: остаёмся на связи, вносим правки и развиваем систему по мере роста бизнеса.',
  },
];

const ASSIST_CONTACT_REPLY =
  'Спасибо за вопрос! Мы скоро с вами свяжемся, чтобы ответить на него.';

const ASSIST_CHIPS = [
  {
    q: 'Заказать работу',
    reply: 'Отлично! Скоро свяжемся с вами.',
  },
  { q: 'Сколько это стоит?' },
  { q: 'Что будет после запуска?' },
];

const ASSIST_OPEN_DELAY_MS = 4500;

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
  let dismissed = false;
  const asked = new Set();
  let autoTimer = null;

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
    return ASSIST_CHIPS.findIndex((item) => normalizeAssistText(item.q) === normalized);
  }

  function resolveAssistReply(text, chipIndex = -1) {
    const chip = chipIndex >= 0 ? ASSIST_CHIPS[chipIndex] : ASSIST_CHIPS[findChipIndex(text)];
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
    nameInput.required = true;

    const phoneInput = document.createElement('input');
    phoneInput.className = 'crm-assist__input';
    phoneInput.type = 'tel';
    phoneInput.name = 'phone';
    phoneInput.autocomplete = 'tel';
    phoneInput.inputMode = 'numeric';
    phoneInput.placeholder = '+7 (___) ___-__-__';
    phoneInput.required = true;

    const error = document.createElement('p');
    error.className = 'crm-assist__form-error';
    error.hidden = true;

    const submit = document.createElement('button');
    submit.className = 'crm-assist__card-submit';
    submit.type = 'submit';
    submit.textContent = 'Отправить';

    form.append(nameInput, phoneInput, error, submit);
    card.append(title, form);
    wrap.append(card);
    log.append(wrap);
    scrollLog();
    bindPhoneMask(phoneInput);
    nameInput.focus();

    form.addEventListener('submit', async (event) => {
      event.preventDefault();
      error.hidden = true;
      error.textContent = '';
      if (!form.reportValidity()) return;

      if (!isPhoneComplete(phoneInput.value || '')) {
        phoneInput.setCustomValidity('Введите номер полностью: +7 (___) ___-__-__');
        phoneInput.reportValidity();
        return;
      }

      phoneInput.setCustomValidity('');
      const name = nameInput.value.trim();
      const reply = pendingReply || ASSIST_CONTACT_REPLY;

      submit.disabled = true;

      try {
        await window.sendCrmLead({
          name,
          phone: phoneInput.value,
          source: 'crm-assist',
        });
        if (typeof window.ym === 'function') {
          window.ym(112716152, 'reachGoal', 'crm-chat');
        }
      } catch (err) {
        error.textContent =
          err?.message || window.getLeadErrorMessage?.('unknown') || 'Не удалось отправить заявку.';
        error.hidden = false;
        submit.disabled = false;
        return;
      }

      contactsDone = true;
      contactsShown = false;
      pendingReply = null;
      wrap.remove();

      addBubble(`${name}, ${phoneInput.value}`, 'user');

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
    markChipsAsked();

    if (!contactsDone) {
      window.setTimeout(showContactsCard, 280);
      return;
    }

    busy = true;
    setComposerEnabled(false);

    window.setTimeout(() => {
      addBubble(reply, 'bot');
      busy = false;
      pendingReply = null;
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

    ASSIST_CHIPS.forEach((item, index) => {
      const chip = document.createElement('button');
      chip.type = 'button';
      chip.className = 'crm-assist__chip';
      chip.dataset.assistChip = String(index);
      chip.textContent = item.q;
      chip.addEventListener('click', () => answerQuestion(item.q, index));
      chips.append(chip);
    });

    greet.append(bubble, chips);
    log.append(greet);
  }

  function openPanel() {
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

  function closePanel() {
    open = false;
    dismissed = true;
    root.classList.remove('is-open');
    panel.hidden = true;
    toggle.setAttribute('aria-expanded', 'false');
    toggle.setAttribute('aria-label', 'Открыть ассистента');
  }

  toggle.addEventListener('click', () => {
    if (open) closePanel();
    else openPanel();
  });

  closeBtn?.addEventListener('click', closePanel);

  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && open) closePanel();
  });

  composer.addEventListener('submit', (event) => {
    event.preventDefault();
    const value = composerInput.value;
    composerInput.value = '';
    answerQuestion(value);
  });

  seedChat();

  autoTimer = window.setTimeout(() => {
    if (!dismissed && !open) openPanel();
  }, ASSIST_OPEN_DELAY_MS);

  window.addEventListener(
    'beforeunload',
    () => {
      if (autoTimer) window.clearTimeout(autoTimer);
    },
    { once: true }
  );
}

function renderGuideFaq() {
  const root = document.querySelector('[data-guide-faq]');
  if (!root) return;

  root.replaceChildren();

  ASSIST_FAQ.forEach((item) => {
    const details = document.createElement('details');
    details.className = 'crm-guide__item';

    const summary = document.createElement('summary');
    summary.className = 'crm-guide__q';
    summary.textContent = item.q;

    const answer = document.createElement('p');
    answer.className = 'crm-guide__a';
    answer.textContent = item.a;

    details.append(summary, answer);
    root.append(details);
  });
}
