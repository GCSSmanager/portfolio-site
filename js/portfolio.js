// Элементы DOM
const portfolioGrid = document.getElementById('portfolioGrid');
const modal = document.getElementById('projectModal');
const modalClose = document.getElementById('modalClose');
const modalTitle = document.getElementById('modalTitle');
const modalDescription = document.getElementById('modalDescription');
const modalImages = document.getElementById('modalImages');
const filterButtons = document.querySelectorAll('.filter-btn');

// Текущий активный фильтр
let activeFilter = 'all';

// Рендеринг проектов
function renderProjects(projectsToRender) {
    portfolioGrid.innerHTML = '';

    projectsToRender.forEach(project => {
        const card = createProjectCard(project);
        portfolioGrid.appendChild(card);
    });
}

// Создание карточки проекта
function createProjectCard(project) {
    const card = document.createElement('div');
    card.className = 'portfolio-card';
    card.dataset.category = project.category;

    // Обрезаем описание для предпросмотра (первые 100 символов)
    const shortDescription = project.description.length > 100
        ? project.description.substring(0, 100) + '...'
        : project.description;

    card.innerHTML = `
        <div class="portfolio-card__header">
            <img src="${project.thumbnail}" alt="${project.title}" class="portfolio-card__avatar" loading="lazy">
            <div class="portfolio-card__header-text">
                <h3 class="portfolio-card__title">${project.title}</h3>
                <span class="portfolio-card__category">${categoryLabels[project.category] || project.category}</span>
            </div>
        </div>
        <div class="portfolio-card__content">
            <p class="portfolio-card__description">${shortDescription}</p>
        </div>
    `;

    card.addEventListener('click', () => openModal(project));

    return card;
}

// Открытие модального окна
function openModal(project) {
    modalTitle.textContent = project.title;
    modalDescription.textContent = project.description;

    // Очистка и добавление изображений в два независимых столбца
    const column1 = document.getElementById('modalImagesColumn1');
    const column2 = document.getElementById('modalImagesColumn2');

    column1.innerHTML = '';
    column2.innerHTML = '';

    // Проверяем, мобильное ли устройство
    const isMobile = window.innerWidth <= 768;

    // Функция для создания элемента изображения
    function createImage(imageUrl) {
        const img = document.createElement('img');
        img.src = imageUrl;
        img.alt = project.title;
        img.className = 'modal__image';
        return img;
    }

    if (isMobile) {
        // На мобильных все изображения из обоих столбцов идут в первый столбец
        const allImages = [...(project.images.column1 || []), ...(project.images.column2 || [])];
        allImages.forEach(imageUrl => {
            column1.appendChild(createImage(imageUrl));
        });
        column2.style.display = 'none';
    } else {
        // На десктопе используем структуру column1 и column2
        if (project.images.column1) {
            project.images.column1.forEach(imageUrl => {
                column1.appendChild(createImage(imageUrl));
            });
        }
        if (project.images.column2) {
            project.images.column2.forEach(imageUrl => {
                column2.appendChild(createImage(imageUrl));
            });
        }
        column2.style.display = 'flex';
    }

    modal.classList.add('active');
    document.body.style.overflow = 'hidden';
}

// Закрытие модального окна
function closeModal() {
    modal.classList.remove('active');
    document.body.style.overflow = '';
}

// Фильтрация проектов
function filterProjects(category) {
    activeFilter = category;

    // Обновление активной кнопки фильтра
    filterButtons.forEach(btn => {
        if (btn.dataset.filter === category) {
            btn.classList.add('active');
        } else {
            btn.classList.remove('active');
        }
    });

    // Фильтрация и рендеринг
    const filteredProjects = category === 'all'
        ? projects
        : projects.filter(project => project.category === category);

    renderProjects(filteredProjects);
}

// Настройка обработчиков событий
function setupEventListeners() {
    // Закрытие модального окна
    modalClose.addEventListener('click', closeModal);

    // Закрытие по клику на overlay
    modal.querySelector('.modal__overlay').addEventListener('click', closeModal);

    // Закрытие по Escape
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && modal.classList.contains('active')) {
            closeModal();
        }
    });

    // Фильтры
    filterButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            const category = btn.dataset.filter;
            filterProjects(category);
        });
    });
}

// Инициализация портфолио
function initPortfolio() {
    renderProjects(projects);
    setupEventListeners();
}

