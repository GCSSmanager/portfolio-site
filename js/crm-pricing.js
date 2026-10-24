function formatPriceRub(value) {
  return `${String(value).replace(/\B(?=(\d{3})+(?!\d))/g, '.')}\u00a0₽`;
}

function initCrmPricing() {
  const root = document.querySelector('[data-crm-pricing]');
  if (!root) return;

  const form = root.querySelector('[data-price-form]');
  const boxes = [...root.querySelectorAll('input[name="price-item"]')];
  const total = root.querySelector('[data-price-total]');
  const phone = form?.querySelector('[name="phone"]');
  const submit = form?.querySelector('[type="submit"]');
  const error = root.querySelector('[data-price-error]');
  const done = root.querySelector('[data-price-done]');
  const send = root.querySelector('.crm-pricing__send');
  const note = root.querySelector('.crm-pricing__note');
  const legal = root.querySelector('.crm-legal-note');
  if (!form || !boxes.length || !total || !phone || !submit) return;

  let selection = { from: 0, to: 0, names: [] };

  function showError(message) {
    if (!error) return;
    error.hidden = false;
    error.textContent = message;
  }

  function clearError() {
    if (!error) return;
    error.hidden = true;
    error.textContent = '';
  }

  function syncTotal() {
    const items = boxes.filter((box) => box.checked);
    selection = { from: 0, to: 0, names: [] };

    if (!items.length) {
      total.textContent = 'Отметьте услуги — появится диапазон';
      return;
    }

    items.forEach((box) => {
      selection.from += Number(box.dataset.from) || 0;
      selection.to += Number(box.dataset.to) || 0;
      const name = box.closest('label')?.querySelector('.crm-price-list__name')?.textContent?.trim();
      if (name) selection.names.push(name);
    });

    total.textContent = `От ${formatPriceRub(selection.from)} до ${formatPriceRub(selection.to)}`;
  }

  function syncSubmit() {
    submit.disabled = !isPhoneComplete(phone.value || '');
  }

  bindPhoneMask(phone);
  boxes.forEach((box) => box.addEventListener('change', syncTotal));
  phone.addEventListener('input', () => {
    phone.setCustomValidity('');
    clearError();
    syncSubmit();
  });
  syncTotal();
  syncSubmit();

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    clearError();

    if (!isPhoneComplete(phone.value || '')) {
      phone.setCustomValidity('Введите номер полностью: +7 (___) ___-__-__');
      phone.reportValidity();
      syncSubmit();
      return;
    }

    phone.setCustomValidity('');
    submit.disabled = true;

    const range = selection.names.length
      ? `Диапазон: от ${formatPriceRub(selection.from)} до ${formatPriceRub(selection.to)}.`
      : 'Услуги не отмечены.';
    const names = selection.names.length ? `Интересует: ${selection.names.join(', ')}.` : '';

    try {
      await window.sendCrmLead({
        name: 'Смета с сайта',
        phone: phone.value,
        source: 'pricing-estimate',
        message: [names, range, 'Точную сумму уточним после разбора задачи.'].filter(Boolean).join(' '),
      });
      form.querySelectorAll('input[name="price-item"]').forEach((box) => {
        box.disabled = true;
      });
      if (send) send.hidden = true;
      if (note) note.hidden = true;
      if (legal) legal.hidden = true;
      if (done) done.hidden = false;
      if (typeof window.ym === 'function') {
        window.ym(112716152, 'reachGoal', 'crm-form');
      }
    } catch (err) {
      showError(err?.message || window.getLeadErrorMessage?.('unknown') || 'Не удалось отправить заявку.');
    } finally {
      syncSubmit();
    }
  });
}
