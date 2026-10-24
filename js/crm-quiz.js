const QUIZ_KIND = {
  services: 'Услуги',
  shop: 'Магазин',
  booking: 'Запись клиентов',
  stock: 'Склад и учёт',
  other: 'Другое',
};

const QUIZ_TEAM = {
  '1-3': '1–3 человека',
  '4-10': '4–10 человек',
  '11-30': '11–30 человек',
  '30+': 'больше 30 человек',
  other: 'Другое',
};

const QUIZ_PAIN = {
  leads: 'Разбор заявок',
  schedule: 'Расписание',
  stock: 'Остатки',
  reports: 'Отчёты',
  other: 'Другое',
};

function initCrmQuiz() {
  const root = document.querySelector('[data-crm-quiz]');
  if (!root) return;

  const form = root.querySelector('[data-quiz-form]');
  const panels = [...root.querySelectorAll('[data-quiz-panel]')];
  const progress = root.querySelector('[data-quiz-progress]');
  const ticks = progress ? [...progress.children] : [];
  const back = root.querySelector('[data-quiz-back]');
  const phone = form?.querySelector('[name="phone"]');
  const submit = form?.querySelector('[type="submit"]');
  const error = root.querySelector('[data-quiz-error]');
  const done = root.querySelector('[data-quiz-done]');
  if (!form || panels.length < 4 || !phone || !submit) return;

  let step = 1;

  bindPhoneMask(phone);

  function showError(message) {
    if (!error) return;
    error.textContent = message;
    error.hidden = false;
  }

  function clearError() {
    if (!error) return;
    error.hidden = true;
    error.textContent = '';
  }

  function syncSubmit() {
    submit.disabled = !isPhoneComplete(phone.value || '');
  }

  function panelByStep(id) {
    return panels.find((item) => Number(item.dataset.quizPanel) === id);
  }

  function clearRadios(panel) {
    panel?.querySelectorAll('input[type="radio"]:checked').forEach((input) => {
      input.checked = false;
    });
  }

  function setStep(next, { focus = true } = {}) {
    step = next;
    panels.forEach((panel) => {
      const id = Number(panel.dataset.quizPanel);
      const current = id === step;
      panel.hidden = !current;
      panel.classList.toggle('is-current', current);
    });
    ticks.forEach((tick, index) => {
      tick.classList.toggle('is-current', index + 1 === step);
      tick.classList.toggle('is-done', index + 1 < step);
    });
    if (progress) {
      progress.setAttribute('aria-label', `Шаг ${step} из 4`);
    }
    if (back) {
      back.hidden = step < 2 || Boolean(done && !done.hidden);
    }
    if (!focus) return;
    const panel = panelByStep(step);
    const legend = panel?.querySelector('legend');
    if (legend) {
      legend.setAttribute('tabindex', '-1');
      legend.focus({ preventScroll: true });
    }
  }

  form.addEventListener('change', (event) => {
    const input = event.target;
    if (!(input instanceof HTMLInputElement) || input.type !== 'radio') return;
    window.setTimeout(() => {
      if (step < 4) setStep(step + 1);
    }, 180);
  });

  back?.addEventListener('click', () => {
    if (step < 2) return;
    clearRadios(panelByStep(step - 1));
    setStep(step - 1);
  });

  phone.addEventListener('input', () => {
    phone.setCustomValidity('');
    clearError();
    syncSubmit();
  });

  syncSubmit();
  setStep(1, { focus: false });

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    clearError();

    if (!isPhoneComplete(phone.value || '')) {
      phone.setCustomValidity('Введите номер полностью: +7 (___) ___-__-__');
      phone.reportValidity();
      return;
    }

    const data = new FormData(form);
    const kind = String(data.get('kind') || '');
    const team = String(data.get('team') || '');
    const pain = String(data.get('pain') || '');

    phone.setCustomValidity('');
    submit.disabled = true;

    try {
      await window.sendCrmLead({
        name: 'Квиз',
        phone: phone.value,
        source: 'crm-quiz',
        message: [
          `Отрасль: ${QUIZ_KIND[kind] || kind}`,
          `Сколько человек? ${QUIZ_TEAM[team] || team}`,
          `Что занимает время? ${QUIZ_PAIN[pain] || pain}`,
        ].join('\n'),
      });

      if (typeof window.ym === 'function') {
        window.ym(112716152, 'reachGoal', 'crm-form');
      }

      panels.forEach((panel) => {
        panel.hidden = true;
        panel.classList.remove('is-current');
      });
      if (back) back.hidden = true;
      if (done) done.hidden = false;
    } catch (err) {
      showError(err?.message || window.getLeadErrorMessage?.('unknown') || 'Не удалось отправить заявку.');
      syncSubmit();
    }
  });
}
