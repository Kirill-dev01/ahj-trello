export default class Board {
    constructor() {
        this.board = document.querySelector('.board');
        // Пытаемся загрузить состояние из памяти, если его нет — создаем пустые массивы
        this.state = this.loadState() || { todo: [], 'in-progress': [], done: [] };

        // Переменные для перетаскивания (Drag and Drop)
        this.draggedEl = null;
        this.placeholder = null;
        this.shiftX = 0;
        this.shiftY = 0;

        this.init();
    }

    init() {
        this.render();
        this.setupForms();
        this.setupDnD();
    }

    // --- РАБОТА С ПАМЯТЬЮ (LocalStorage) ---

    loadState() {
        const saved = localStorage.getItem('trello-state');
        return saved ? JSON.parse(saved) : null;
    }

    saveState() {
        const newState = { todo: [], 'in-progress': [], done: [] };
        // Проходим по всем колонкам и собираем тексты карточек
        document.querySelectorAll('.column').forEach(col => {
            const id = col.dataset.column;
            const cards = col.querySelectorAll('.card:not(.dragged)'); // Игнорируем ту, что сейчас висит в воздухе
            cards.forEach(card => {
                newState[id].push(card.querySelector('.card-text').textContent);
            });
        });
        localStorage.setItem('trello-state', JSON.stringify(newState));
    }

    // --- ОТРИСОВКА И СОЗДАНИЕ КАРТОЧЕК ---

    render() {
        document.querySelectorAll('.column').forEach(col => {
            const id = col.dataset.column;
            const list = col.querySelector('.cards-list');
            list.innerHTML = ''; // Очищаем колонку

            this.state[id].forEach(text => {
                list.appendChild(this.createCard(text));
            });
        });
    }

    createCard(text) {
        const card = document.createElement('div');
        card.className = 'card';

        // Оборачиваем текст в span, чтобы было удобно его читать при сохранении
        const textSpan = document.createElement('span');
        textSpan.className = 'card-text';
        textSpan.textContent = text;

        // Крестик удаления
        const del = document.createElement('div');
        del.className = 'card-delete';
        del.textContent = '✖';

        card.appendChild(textSpan);
        card.appendChild(del);
        return card;
    }

    // --- ЛОГИКА КНОПОК И ФОРМ ---

    setupForms() {
        this.board.addEventListener('click', (e) => {
            // Клик по кнопке "+ Add another card"
            if (e.target.classList.contains('add-card-btn')) {
                e.target.classList.add('hidden');
                e.target.nextElementSibling.classList.remove('hidden');
            }

            // Клик по крестику (закрыть форму)
            if (e.target.classList.contains('btn-cancel')) {
                const form = e.target.closest('.add-card-form');
                form.classList.add('hidden');
                form.previousElementSibling.classList.remove('hidden');
                form.querySelector('.card-input').value = '';
            }

            // Клик по кнопке "Add Card" (сохранить карточку)
            if (e.target.classList.contains('btn-save')) {
                const form = e.target.closest('.add-card-form');
                const input = form.querySelector('.card-input');
                const text = input.value.trim();

                if (text) {
                    const list = form.closest('.column').querySelector('.cards-list');
                    list.appendChild(this.createCard(text));
                    input.value = '';
                    form.classList.add('hidden');
                    form.previousElementSibling.classList.remove('hidden');
                    this.saveState(); // Обновляем LocalStorage
                }
            }

            // Удаление карточки (клик по крестику на самой карточке)
            if (e.target.classList.contains('card-delete')) {
                e.target.closest('.card').remove();
                this.saveState();
            }
        });
    }

    // --- МАТЕМАТИКА DRAG AND DROP ---

    setupDnD() {
        const onMouseDown = (e) => {
            // Если кликнули не по карточке или кликнули по крестику удаления - ничего не делаем
            if (!e.target.closest('.card') || e.target.classList.contains('card-delete')) return;

            e.preventDefault(); // Отключаем выделение текста
            this.draggedEl = e.target.closest('.card');

            // Вычисляем место клика относительно краев карточки, чтобы мышка не прыгала в центр
            const rect = this.draggedEl.getBoundingClientRect();
            this.shiftX = e.clientX - rect.left;
            this.shiftY = e.clientY - rect.top;

            // Создаем серую тень-заглушку того же размера, куда будет падать карточка
            this.placeholder = document.createElement('div');
            this.placeholder.className = 'card-placeholder';
            this.placeholder.style.height = rect.height + 'px';

            // Фиксируем ширину карточки, чтобы при отрыве она не сжалась
            this.draggedEl.style.width = rect.width + 'px';
            this.draggedEl.classList.add('dragged');

            // Ставим заглушку на старое место карточки, а саму карточку выкидываем в body
            this.draggedEl.after(this.placeholder);
            document.body.appendChild(this.draggedEl);

            this.moveAt(e.pageX, e.pageY);

            // Включаем слежение за мышью
            document.addEventListener('mousemove', onMouseMove);
            document.addEventListener('mouseup', onMouseUp);
        };

        const onMouseMove = (e) => {
            if (!this.draggedEl) return;
            this.moveAt(e.pageX, e.pageY);

            // Ищем элемент под мышкой
            const elemBelow = document.elementFromPoint(e.clientX, e.clientY);
            if (!elemBelow) return;

            const column = elemBelow.closest('.column');
            if (column) {
                const list = column.querySelector('.cards-list');
                const cardBelow = elemBelow.closest('.card:not(.dragged)');

                if (cardBelow) {
                    // Если навели на другую карточку, решаем: вставить тень ДО или ПОСЛЕ неё (в зависимости от центра)
                    const rect = cardBelow.getBoundingClientRect();
                    const isHalf = e.clientY < rect.top + rect.height / 2;
                    if (isHalf) {
                        list.insertBefore(this.placeholder, cardBelow);
                    } else {
                        list.insertBefore(this.placeholder, cardBelow.nextElementSibling);
                    }
                } else {
                    // Если навели на пустую колонку - просто кидаем тень вниз
                    list.appendChild(this.placeholder);
                }
            }
        };

        const onMouseUp = () => {
            if (!this.draggedEl) return;

            // Снимаем слушатели
            document.removeEventListener('mousemove', onMouseMove);
            document.removeEventListener('mouseup', onMouseUp);

            // Возвращаем карточку в нормальный вид
            this.draggedEl.classList.remove('dragged');
            this.draggedEl.style.width = 'auto';
            this.draggedEl.style.left = 'auto';
            this.draggedEl.style.top = 'auto';

            // Ставим карточку на место заглушки
            this.placeholder.replaceWith(this.draggedEl);

            this.draggedEl = null;
            this.placeholder = null;

            // Сохраняем новое положение в память
            this.saveState();
        };

        this.board.addEventListener('mousedown', onMouseDown);
    }

    moveAt(pageX, pageY) {
        this.draggedEl.style.left = pageX - this.shiftX + 'px';
        this.draggedEl.style.top = pageY - this.shiftY + 'px';
    }
}