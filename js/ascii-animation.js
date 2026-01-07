// Анимация ASCII символов на фоне
class ASCIIAnimation {
    constructor() {
        this.container = null;
        this.chars = ['0', '1', '#', '$', '%', '&', '*', '+', '-', '=', '@', '~', '>', '<', '|', '/', '\\', '{', '}', '[', ']', '(', ')'];
        this.activeChars = [];
        this.maxChars = 70;
        this.spawnInterval = 500; // Интервал создания новых символов (мс)
        this.minDuration = 4000; // Минимальная длительность анимации (мс) - быстрее
        this.maxDuration = 7000; // Максимальная длительность анимации (мс) - быстрее
    }

    init() {
        // Создаем контейнер для ASCII символов
        this.container = document.createElement('div');
        this.container.className = 'ascii-background';
        document.body.appendChild(this.container);

        // Запускаем создание символов
        this.startSpawning();
    }

    startSpawning() {
        // Создаем первый символ сразу
        this.createChar();

        // Продолжаем создавать символы с интервалом
        setInterval(() => {
            if (this.activeChars.length < this.maxChars) {
                this.createChar();
            }
        }, this.spawnInterval);
    }

    createChar() {
        const char = document.createElement('div');
        char.className = 'ascii-char';

        // Случайный символ
        const randomChar = this.chars[Math.floor(Math.random() * this.chars.length)];
        char.textContent = randomChar;

        // Случайная позиция по X
        const x = Math.random() * 100;
        char.style.left = `${x}%`;

        // Случайная длительность анимации
        const duration = this.minDuration + Math.random() * (this.maxDuration - this.minDuration);
        char.style.animationDuration = `${duration}ms`;

        // Минимальная задержка для разнообразия (убрали большую задержку)
        const delay = Math.random() * 500;
        char.style.animationDelay = `${delay}ms`;

        // Сразу скрываем символ до начала анимации
        char.style.opacity = '0';

        // Случайный размер (больше и заметнее)
        const size = 1.5 + Math.random() * 1.5; // От 1.5rem до 3rem
        char.style.fontSize = `${size}rem`;

        // Добавляем случайное свечение
        const glowIntensity = 0.3 + Math.random() * 0.4;
        char.style.textShadow = `0 0 ${5 + Math.random() * 10}px rgba(0, 255, 65, ${glowIntensity}), 0 0 ${10 + Math.random() * 15}px rgba(0, 255, 65, ${glowIntensity * 0.5})`;

        // Добавляем в контейнер
        this.container.appendChild(char);

        // Добавляем в список активных
        this.activeChars.push(char);

        // Удаляем после завершения анимации
        setTimeout(() => {
            if (char.parentNode) {
                char.parentNode.removeChild(char);
                const index = this.activeChars.indexOf(char);
                if (index > -1) {
                    this.activeChars.splice(index, 1);
                }
            }
        }, duration + delay);
    }

    destroy() {
        if (this.container && this.container.parentNode) {
            this.container.parentNode.removeChild(this.container);
        }
        this.activeChars = [];
    }
}

// Инициализация анимации
let asciiAnimation;

function initASCIIAnimation() {
    asciiAnimation = new ASCIIAnimation();
    asciiAnimation.init();
}

// Запускаем после загрузки DOM
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initASCIIAnimation);
} else {
    initASCIIAnimation();
}

