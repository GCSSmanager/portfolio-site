const orderModal = document.getElementById('orderModal');
const orderForm = document.getElementById('orderForm');
const orderSuccess = document.getElementById('orderSuccess');
const orderPhone = document.getElementById('orderPhone');
let orderModalFocus = null;
let orderModalScrollY = 0;

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

function initPhoneMask() {
  if (!orderPhone) return;

  orderPhone.addEventListener('focus', () => {
    if (!orderPhone.value.startsWith('+7')) {
      orderPhone.value = PHONE_PREFIX;
    }

    if (orderPhone.selectionStart < PHONE_PREFIX.length) {
      orderPhone.setSelectionRange(orderPhone.value.length, orderPhone.value.length);
    }
  });

  orderPhone.addEventListener('input', () => {
    const cursorFromEnd = orderPhone.value.length - orderPhone.selectionStart;
    orderPhone.value = formatRuPhone(orderPhone.value);
    const nextPos = Math.max(PHONE_PREFIX.length, orderPhone.value.length - cursorFromEnd);
    orderPhone.setSelectionRange(nextPos, nextPos);
  });

  orderPhone.addEventListener('keydown', (event) => {
    const { selectionStart, selectionEnd, value } = orderPhone;

    if (selectionStart !== selectionEnd) {
      return;
    }

    if (event.key === 'Backspace' && selectionStart <= PHONE_PREFIX.length) {
      event.preventDefault();
      orderPhone.value = PHONE_PREFIX;
      orderPhone.setSelectionRange(PHONE_PREFIX.length, PHONE_PREFIX.length);
      return;
    }

    if (event.key === 'Delete' && selectionStart < PHONE_PREFIX.length) {
      event.preventDefault();
      orderPhone.setSelectionRange(PHONE_PREFIX.length, PHONE_PREFIX.length);
      return;
    }

    if (event.key !== 'Backspace') {
      return;
    }

    const charBefore = value[selectionStart - 1];
    if (charBefore === ' ' || charBefore === '-' || charBefore === '(' || charBefore === ')') {
      event.preventDefault();
      const digits = phoneDigits(value);
      orderPhone.value = formatRuPhone(digits.slice(0, -1));
      orderPhone.setSelectionRange(orderPhone.value.length, orderPhone.value.length);
    }
  });

  orderPhone.addEventListener('blur', () => {
    if (!orderPhone.value.startsWith('+7')) {
      orderPhone.value = PHONE_PREFIX;
    }
  });
}

function showOrderForm() {
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
}

function showOrderSuccess() {
  if (orderForm) {
    orderForm.hidden = true;
  }

  if (orderSuccess) {
    orderSuccess.hidden = false;
  }
}

function openOrderModal(trigger) {
  if (!orderModal) return;

  orderModalFocus = trigger || document.activeElement;
  if (orderModalFocus && typeof orderModalFocus.blur === 'function') {
    orderModalFocus.blur();
  }

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

function handleOrderSubmit(event) {
  event.preventDefault();

  if (!orderForm?.reportValidity()) {
    return;
  }

  if (!isPhoneComplete(orderPhone?.value || '')) {
    orderPhone?.setCustomValidity('Введите номер полностью: +7 (___) ___-__-__');
    orderPhone?.reportValidity();
    return;
  }

  orderPhone?.setCustomValidity('');
  showOrderSuccess();
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
