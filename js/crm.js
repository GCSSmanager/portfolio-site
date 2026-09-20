const orderModal = document.getElementById('orderModal');
const orderForm = document.getElementById('orderForm');
const orderFormBlock = document.getElementById('orderFormBlock');
const orderSuccess = document.getElementById('orderSuccess');
const orderPhone = document.getElementById('orderPhone');
const orderModalTitle = document.getElementById('orderModalTitle');
const orderFormError = document.getElementById('orderFormError');
let orderModalFocus = null;
let orderModalScrollY = 0;
let orderLeadSource = 'crm-order';

const PHONE_PREFIX = '+7 (';

function phoneDigits(value) {
  let digits = String(value).replace(/\D/g, '');

  if (digits.startsWith('8')) {
    digits = `7${digits.slice(1)}`;
  }

  if (digits.startsWith('7')) {
    digits = digits.slice(1);
  }

  return digits.slice(0, 10);
}

function formatRuPhone(value) {
  const digits = phoneDigits(value);

  if (!digits.length) {
    return PHONE_PREFIX;
  }

  let formatted = `${PHONE_PREFIX}${digits.slice(0, 3)}`;

  if (digits.length < 3) {
    return formatted;
  }

  formatted += `) ${digits.slice(3, 6)}`;

  if (digits.length <= 6) {
    return formatted;
  }

  formatted += `-${digits.slice(6, 8)}`;

  if (digits.length <= 8) {
    return formatted;
  }

  return `${formatted}-${digits.slice(8, 10)}`;
}

function isPhoneComplete(value) {
  return phoneDigits(value).length === 10;
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
  });

  input.addEventListener('keydown', (event) => {
    const { selectionStart, selectionEnd, value } = input;

    if (selectionStart !== selectionEnd) {
      return;
    }

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

    if (event.key !== 'Backspace') {
      return;
    }

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

function initPhoneMask() {
  bindPhoneMask(orderPhone);
}

function initCrmHeroEstimate() {
  const form = document.querySelector('[data-hero-estimate]');
  if (!form) return;

  const phone = form.querySelector('[name="phone"]');
  const submit = form.querySelector('[type="submit"]');
  const error = form.querySelector('[data-hero-estimate-error]');
  const done = document.querySelector('[data-hero-estimate-done]');
  if (!phone || !submit) return;

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

  phone.addEventListener('input', () => {
    phone.setCustomValidity('');
    clearError();
    syncSubmit();
  });

  syncSubmit();

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    clearError();

    if (!isPhoneComplete(phone.value || '')) {
      phone.setCustomValidity('Введите номер полностью: +7 (___) ___-__-__');
      phone.reportValidity();
      return;
    }

    phone.setCustomValidity('');
    submit.disabled = true;

    try {
      await window.sendCrmLead({
        name: 'Расчёт стоимости',
        phone: phone.value,
        source: 'hero-estimate',
      });

      if (typeof window.ym === 'function') {
        window.ym(112716152, 'reachGoal', 'crm-form');
      }

      form.hidden = true;
      if (done) done.hidden = false;
    } catch (err) {
      showError(err?.message || window.getLeadErrorMessage?.('unknown') || 'Не удалось отправить заявку.');
      syncSubmit();
    }
  });
}

function clearOrderFormError() {
  if (!orderFormError) return;
  orderFormError.hidden = true;
  orderFormError.textContent = '';
}

function showOrderFormError(message) {
  if (!orderFormError) {
    window.alert(message);
    return;
  }
  orderFormError.textContent = message;
  orderFormError.hidden = false;
}

function showOrderForm() {
  if (orderFormBlock) {
    orderFormBlock.hidden = false;
  }

  if (orderForm) {
    orderForm.hidden = false;
    orderForm.reset();
  }

  if (orderPhone) {
    orderPhone.value = PHONE_PREFIX;
  }

  if (orderSuccess) {
    orderSuccess.hidden = true;
  }

  clearOrderFormError();

  if (orderModalTitle) {
    orderModalTitle.textContent = 'Оставить заявку';
  }
}

function showOrderSuccess() {
  if (orderFormBlock) {
    orderFormBlock.hidden = true;
  }

  if (orderForm) {
    orderForm.hidden = true;
  }

  if (orderSuccess) {
    orderSuccess.hidden = false;
  }

  if (orderModalTitle) {
    orderModalTitle.textContent = 'Заявка принята';
  }

  if (typeof window.ym === 'function') {
    window.ym(112716152, 'reachGoal', 'crm-form');
  }
}

function openOrderModal(trigger) {
  if (!orderModal) return;

  orderModalFocus = trigger || document.activeElement;
  if (orderModalFocus && typeof orderModalFocus.blur === 'function') {
    orderModalFocus.blur();
  }

  orderLeadSource =
    (trigger && trigger.getAttribute && trigger.getAttribute('data-order-source')) ||
    'crm-order';

  showOrderForm();

  orderModal.hidden = false;
  orderModal.classList.add('is-open');
  orderModal.setAttribute('aria-hidden', 'false');
  document.body.classList.add('is-modal-open');
  lockPageScroll();

  const closeBtn = orderModal.querySelector('.modal__close');
  if (closeBtn) closeBtn.blur();
}

function closeOrderModal() {
  if (!orderModal || !orderModal.classList.contains('is-open')) return;

  orderModal.classList.remove('is-open');
  orderModal.hidden = true;
  orderModal.setAttribute('aria-hidden', 'true');
  document.body.classList.remove('is-modal-open');
  unlockPageScroll();

  if (orderModalFocus && typeof orderModalFocus.blur === 'function') {
    orderModalFocus.blur();
  }

  orderModalFocus = null;
}

function lockPageScroll() {
  orderModalScrollY = window.scrollY;
  document.body.style.position = 'fixed';
  document.body.style.top = `-${orderModalScrollY}px`;
  document.body.style.left = '0';
  document.body.style.right = '0';
  document.body.style.overflow = 'hidden';
}

function unlockPageScroll() {
  document.body.style.position = '';
  document.body.style.top = '';
  document.body.style.left = '';
  document.body.style.right = '';
  document.body.style.overflow = '';

  const html = document.documentElement;
  const behavior = html.style.scrollBehavior;
  html.style.scrollBehavior = 'auto';
  window.scrollTo(0, orderModalScrollY);
  html.style.scrollBehavior = behavior;
}

async function handleOrderSubmit(event) {
  event.preventDefault();
  clearOrderFormError();

  if (!orderForm?.reportValidity()) {
    return;
  }

  if (!isPhoneComplete(orderPhone?.value || '')) {
    orderPhone?.setCustomValidity('Введите номер полностью: +7 (___) ___-__-__');
    orderPhone?.reportValidity();
    return;
  }

  orderPhone?.setCustomValidity('');

  const submitBtn = orderForm.querySelector('[type="submit"]');
  const name = orderForm.querySelector('[name="name"]')?.value.trim() || '';

  if (submitBtn) submitBtn.disabled = true;

  try {
    await window.sendCrmLead({
      name,
      phone: orderPhone.value,
      source: orderLeadSource,
    });
    showOrderSuccess();
  } catch (error) {
    showOrderFormError(error?.message || window.getLeadErrorMessage?.('unknown') || 'Не удалось отправить заявку.');
  } finally {
    if (submitBtn) submitBtn.disabled = false;
  }
}

function initCrmOrderModal() {
  if (!orderModal) return;

  initPhoneMask();
  showOrderForm();

  document.querySelectorAll('[data-order-open]').forEach((btn) => {
    btn.addEventListener('click', () => openOrderModal(btn));
  });

  orderModal.querySelectorAll('[data-modal-close]').forEach((el) => {
    el.addEventListener('click', closeOrderModal);
  });

  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') closeOrderModal();
  });

  orderPhone?.addEventListener('input', () => {
    orderPhone.setCustomValidity('');
    clearOrderFormError();
  });

  orderForm?.addEventListener('submit', handleOrderSubmit);
}

const crmNav = document.getElementById('crmNav');
const crmNavToggle = document.querySelector('[data-nav-toggle]');

function closeCrmNav() {
  if (!crmNav || !crmNavToggle) return;

  crmNav.classList.remove('is-nav-open');
  crmNavToggle.setAttribute('aria-expanded', 'false');
  crmNavToggle.setAttribute('aria-label', 'Открыть меню');
}

function openCrmNav() {
  if (!crmNav || !crmNavToggle) return;

  crmNav.classList.add('is-nav-open');
  crmNavToggle.setAttribute('aria-expanded', 'true');
  crmNavToggle.setAttribute('aria-label', 'Закрыть меню');
}

function isCrmBurgerMode() {
  if (!crmNavToggle) return false;
  return window.getComputedStyle(crmNavToggle).display !== 'none';
}

function initCrmNav() {
  if (!crmNav || !crmNavToggle) return;

  crmNavToggle.addEventListener('click', () => {
    if (crmNav.classList.contains('is-nav-open')) {
      closeCrmNav();
    } else {
      openCrmNav();
    }
  });

  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') closeCrmNav();
  });

  window.addEventListener('resize', () => {
    if (!isCrmBurgerMode()) {
      closeCrmNav();
    }
  });

  document.addEventListener('click', (event) => {
    if (!crmNav.classList.contains('is-nav-open')) return;
    if (crmNav.contains(event.target)) return;
    closeCrmNav();
  });

  crmNav.querySelectorAll('.nav__link[href^="#"]').forEach((link) => {
    link.addEventListener('click', () => closeCrmNav());
  });
}

function initCrmReviews() {
  const root = document.querySelector('[data-reviews]');
  if (!root) return;

  const slides = [...root.querySelectorAll('[data-review]')];
  const dotsRoot = root.querySelector('[data-reviews-dots]');
  const prev = root.querySelector('[data-reviews-prev]');
  const next = root.querySelector('[data-reviews-next]');
  if (!slides.length || !dotsRoot || !prev || !next) return;

  let index = 0;

  slides.forEach((_, i) => {
    const dot = document.createElement('button');
    dot.type = 'button';
    dot.className = 'crm-reviews__dot';
    dot.setAttribute('aria-label', `Письмо ${i + 1}`);
    dot.addEventListener('click', () => show(i));
    dotsRoot.append(dot);
  });

  const dots = [...dotsRoot.children];

  function show(nextIndex) {
    index = (nextIndex + slides.length) % slides.length;

    slides.forEach((slide, i) => {
      slide.classList.toggle('is-active', i === index);
    });

    dots.forEach((dot, i) => {
      dot.classList.toggle('is-active', i === index);
    });
  }

  prev.addEventListener('click', () => show(index - 1));
  next.addEventListener('click', () => show(index + 1));
  show(0);
}

function initCrmToTop() {
  const btn = document.querySelector('[data-totop]');
  if (!btn) return;

  const toggle = () => {
    btn.classList.toggle('is-visible', window.scrollY > 280);
  };

  btn.addEventListener('click', (event) => {
    event.preventDefault();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  });

  window.addEventListener('scroll', toggle, { passive: true });
  toggle();
}
