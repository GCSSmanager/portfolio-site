const portfolioGrid = document.getElementById('portfolioGrid');
const modal = document.getElementById('projectModal');
const modalTitle = document.getElementById('modalTitle');
const modalDescription = document.getElementById('modalDescription');
const filterButtons = document.querySelectorAll('.filter');

let activeFilter = 'all';
let lastFocus = null;

function escapeHtml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');
}

function createProjectCard(project) {
  const card = document.createElement('button');
  card.type = 'button';
  card.className = 'project';
  card.dataset.category = project.category;
  card.setAttribute('aria-label', `Открыть проект: ${project.title}`);

  card.innerHTML = `
    <div class="project__media">
      <img src="${escapeHtml(project.thumbnail)}" alt="" width="800" height="600" loading="lazy">
    </div>
  `;

  card.addEventListener('click', () => openModal(project, card));
  return card;
}

function renderProjects(list) {
  portfolioGrid.replaceChildren();
  const fragment = document.createDocumentFragment();
  list.forEach((project) => {
    fragment.appendChild(createProjectCard(project));
  });
  portfolioGrid.appendChild(fragment);
}

function appendImage(parent, src, title) {
  const img = document.createElement('img');
  img.src = src;
  img.alt = title;
  img.className = 'modal__image';
  img.loading = 'lazy';
  parent.appendChild(img);
}

function openModal(project, trigger) {
  lastFocus = trigger || document.activeElement;
  modalTitle.textContent = project.title;

  const features = (project.features || [])
    .map((item) => `<li>${escapeHtml(item)}</li>`)
    .join('');

  const result = project.result
    ? `<p class="modal__result"><strong>Результат для бизнеса.</strong> ${escapeHtml(project.result)}</p>`
    : '';

  const featuresBlock = features
    ? `<details class="modal__toggle">
        <summary class="modal__toggle-summary">Возможности</summary>
        <ul class="modal__features" role="list">${features}</ul>
      </details>`
    : '';

  modalDescription.innerHTML = `
    <p>${escapeHtml(project.description)}</p>
    ${featuresBlock}
    ${result}
  `;

  const column1 = document.getElementById('modalImagesColumn1');
  const column2 = document.getElementById('modalImagesColumn2');
  column1.replaceChildren();
  column2.replaceChildren();

  const col1 = project.images?.column1 || [];
  const col2 = project.images?.column2 || [];
  const isMobile = window.matchMedia('(max-width: 40rem)').matches;

  if (isMobile) {
    [...col1, ...col2].forEach((src) => appendImage(column1, src, project.title));
  } else {
    col1.forEach((src) => appendImage(column1, src, project.title));
    col2.forEach((src) => appendImage(column2, src, project.title));
  }

  modal.classList.add('is-open');
  modal.setAttribute('aria-hidden', 'false');
  document.body.style.overflow = 'hidden';

  const modalBody = modal.querySelector('.modal__body');
  const modalPanel = modal.querySelector('.modal__panel');
  if (modalBody) modalBody.scrollTop = 0;
  if (modalPanel) modalPanel.scrollTop = 0;

  modal.querySelector('.modal__close')?.focus({ preventScroll: true });

  requestAnimationFrame(() => {
    if (modalBody) modalBody.scrollTop = 0;
    if (modalPanel) modalPanel.scrollTop = 0;
  });
}

function closeModal() {
  if (!modal.classList.contains('is-open')) return;
  modal.classList.remove('is-open');
  modal.setAttribute('aria-hidden', 'true');
  document.body.style.overflow = '';
  if (lastFocus && typeof lastFocus.blur === 'function') {
    lastFocus.blur();
  }
  lastFocus = null;
}

function filterProjects(category) {
  activeFilter = category;

  filterButtons.forEach((btn) => {
    btn.classList.toggle('is-active', btn.dataset.filter === category);
  });

  const filtered = category === 'all'
    ? projects
    : projects.filter((project) => project.category === category);

  renderProjects(filtered);
}

function setupEventListeners() {
  document.querySelectorAll('[data-modal-close]').forEach((el) => {
    el.addEventListener('click', closeModal);
  });

  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') closeModal();
  });

  filterButtons.forEach((btn) => {
    btn.addEventListener('click', () => filterProjects(btn.dataset.filter));
  });
}

function initPortfolio() {
  renderProjects(projects);
  setupEventListeners();
}
