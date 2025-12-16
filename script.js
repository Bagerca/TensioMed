/**
 * CardioLog - Script
 * Профессиональная логика для медицинского приложения
 */

// --- 1. Глобальное состояние (State) ---
const AppState = {
    userName: "Пользователь",
    records: [] // Здесь будут храниться все измерения
};

// Переменная для графика
let pressureChartInstance = null;

// --- 2. Инициализация при загрузке страницы ---
document.addEventListener('DOMContentLoaded', () => {
    // 1. Загружаем данные из памяти браузера
    loadData();

    // 2. Инициализируем (рисуем пустой) график
    initChart();

    // 3. Отрисовываем интерфейс
    renderApp();

    // 4. Вешаем обработчик на форму ввода
    const form = document.getElementById('bpForm');
    if (form) {
        form.addEventListener('submit', handleFormSubmit);
    }
});

// --- 3. Работа с LocalStorage (Сохранение/Загрузка) ---

function saveData() {
    // Превращаем объект в строку и сохраняем в браузере
    localStorage.setItem('cardioLogData_v1', JSON.stringify(AppState));
    renderApp(); // Перерисовываем экран
}

function loadData() {
    const rawData = localStorage.getItem('cardioLogData_v1');
    if (rawData) {
        const parsed = JSON.parse(rawData);
        // Восстанавливаем данные, если они есть
        AppState.userName = parsed.userName || "Пользователь";
        AppState.records = parsed.records || [];
    }
}

function clearAllData() {
    if (confirm("Вы уверены? Это удалит всю историю измерений безвозвратно.")) {
        AppState.records = [];
        saveData();
    }
}

// --- 4. Логика формы и добавления записи ---

function handleFormSubmit(e) {
    e.preventDefault(); // Останавливаем перезагрузку страницы

    // Получаем значения из полей
    const sysVal = document.getElementById('sysInput').value;
    const diaVal = document.getElementById('diaInput').value;
    const pulseVal = document.getElementById('pulseInput').value;
    const noteVal = document.getElementById('noteInput').value;

    // Валидация
    if (!sysVal || !diaVal || !pulseVal) {
        alert("Пожалуйста, заполните основные поля (Давление и Пульс)");
        return;
    }

    const now = new Date();
    
    // Создаем объект записи
    const newRecord = {
        id: Date.now(), // Уникальный номер записи
        timestamp: now.getTime(), // Время в миллисекундах для сортировки
        dateString: now.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' }),
        timeString: now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        sys: parseInt(sysVal),
        dia: parseInt(diaVal),
        pulse: parseInt(pulseVal),
        note: noteVal || ""
    };

    // Добавляем в массив и сохраняем
    AppState.records.push(newRecord);
    saveData();

    // Очищаем форму
    e.target.reset();
    
    // Переключаем фокус на первое поле (удобство)
    document.getElementById('sysInput').focus();
}

// Функция удаления одной записи
function deleteRecord(id) {
    if (confirm("Удалить эту запись?")) {
        AppState.records = AppState.records.filter(record => record.id !== id);
        saveData();
    }
}

// --- 5. Логика Интерфейса (Вкладки и Профиль) ---

// Переключение вкладок
function switchTab(tabId) {
    // 1. Скрываем все содержимое вкладок
    document.querySelectorAll('.tab-content').forEach(el => el.classList.remove('active-tab'));
    
    // 2. Убираем активный класс у кнопок
    document.querySelectorAll('.nav-btn').forEach(btn => btn.classList.remove('active'));

    // 3. Показываем нужную вкладку
    const targetTab = document.getElementById(tabId);
    if (targetTab) {
        targetTab.classList.add('active-tab');
    }

    // 4. Подсвечиваем кнопку (простой способ через поиск по onclick)
    // В реальном проекте лучше использовать data-attributes, но так проще для старта
    const buttons = document.querySelectorAll('.nav-btn');
    if (tabId === 'dashboard') buttons[0].classList.add('active');
    if (tabId === 'history') buttons[1].classList.add('active');
    if (tabId === 'settings') buttons[2].classList.add('active');
}

// Редактирование профиля
function editName() {
    switchTab('settings');
    const nameInput = document.getElementById('settingsNameInput');
    nameInput.value = AppState.userName;
    nameInput.focus();
}

function saveSettings() {
    const input = document.getElementById('settingsNameInput');
    if (input.value.trim() !== "") {
        AppState.userName = input.value.trim();
        saveData();
        alert("Имя профиля обновлено!");
        switchTab('dashboard');
    } else {
        alert("Введите имя");
    }
}

// --- 6. Отрисовка (Render) - Самая важная часть ---

function renderApp() {
    // А. Обновляем имя везде
    const nameDisplay = document.getElementById('userNameDisplay');
    if(nameDisplay) nameDisplay.innerText = AppState.userName;

    // Б. Сортировка данных
    // Для графика: от старых к новым
    const sortedForChart = [...AppState.records].sort((a, b) => a.timestamp - b.timestamp);
    // Для таблицы: от новых к старым
    const sortedForTable = [...AppState.records].sort((a, b) => b.timestamp - a.timestamp);

    // В. Обновляем виджет "Последний замер" (Dashboard)
    renderStatusWidget(sortedForChart);

    // Г. Обновляем таблицу (History)
    renderHistoryTable(sortedForTable);

    // Д. Обновляем график
    updateChart(sortedForChart);
}

function renderStatusWidget(records) {
    const statusDiv = document.getElementById('statusDisplay');
    if (!statusDiv) return;

    if (records.length === 0) {
        statusDiv.innerHTML = `<span style="color:#95A5A6">Нет данных за сегодня</span>`;
        return;
    }

    const last = records[records.length - 1]; // Последняя запись
    const cat = getCategory(last.sys, last.dia);

    statusDiv.innerHTML = `
        <div class="bp-big" style="color: ${cat.color}">${last.sys} / ${last.dia}</div>
        <div class="badge" style="background: ${cat.bg}; color: ${cat.color}; margin-top:5px; display:inline-block;">
            ${cat.text}
        </div>
        <div style="margin-top: 10px; color: #7F8C8D; font-size: 14px;">
            Пульс: <b>${last.pulse}</b> <span style="font-size:12px">уд/м</span> • ${last.timeString}
        </div>
    `;
}

function renderHistoryTable(records) {
    const tbody = document.getElementById('fullHistoryBody');
    if (!tbody) return;

    tbody.innerHTML = ''; // Очищаем таблицу

    if (records.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" style="text-align:center; padding:20px;">История пуста</td></tr>';
        return;
    }

    records.forEach(rec => {
        const cat = getCategory(rec.sys, rec.dia);
        
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>
                <div style="font-weight:600">${rec.dateString}</div>
                <div style="font-size:12px; color:#999">${rec.timeString}</div>
            </td>
            <td>
                <span style="font-size:16px; font-weight:700">${rec.sys} / ${rec.dia}</span>
            </td>
            <td>${rec.pulse}</td>
            <td>
                <span class="badge" style="background:${cat.bg}; color:${cat.color}">${cat.text}</span>
            </td>
            <td style="color:#666; font-size:13px; max-width: 150px; overflow:hidden; text-overflow:ellipsis;">
                ${rec.note}
            </td>
            <td>
                <button class="btn-delete" onclick="deleteRecord(${rec.id})" title="Удалить">✕</button>
            </td>
        `;
        tbody.appendChild(row);
    });
}

// --- 7. Логика Графика (Chart.js) ---

function initChart() {
    const ctx = document.getElementById('pressureChart');
    if (!ctx) return;

    pressureChartInstance = new Chart(ctx, {
        type: 'line',
        data: {
            labels: [],
            datasets: [
                {
                    label: 'Систолическое (SYS)',
                    data: [],
                    borderColor: '#E53935', // Красный
                    backgroundColor: 'rgba(229, 57, 53, 0.1)', // Заливка под графиком
                    borderWidth: 3,
                    pointBackgroundColor: '#fff',
                    pointBorderColor: '#E53935',
                    pointRadius: 4,
                    tension: 0.3, // Плавность линии
                    fill: true
                },
                {
                    label: 'Диастолическое (DIA)',
                    data: [],
                    borderColor: '#2C3E50', // Темно-синий
                    backgroundColor: 'transparent',
                    borderWidth: 2,
                    borderDash: [5, 5], // Пунктир
                    pointRadius: 3,
                    tension: 0.3,
                    fill: false
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: false } // Легенда скрыта, у нас свой дизайн
            },
            scales: {
                y: {
                    beginAtZero: false,
                    suggestedMin: 60,
                    suggestedMax: 160,
                    grid: { color: '#F0F0F0' }
                },
                x: {
                    grid: { display: false }
                }
            }
        }
    });
}

function updateChart(records) {
    if (!pressureChartInstance) return;

    // Берем только последние 10 записей для графика, чтобы не было каши
    const recentRecords = records.slice(-10);

    // Подготавливаем массивы данных
    const labels = recentRecords.map(r => r.dateString + ' ' + r.timeString);
    const sysData = recentRecords.map(r => r.sys);
    const diaData = recentRecords.map(r => r.dia);

    // Обновляем график
    pressureChartInstance.data.labels = labels;
    pressureChartInstance.data.datasets[0].data = sysData;
    pressureChartInstance.data.datasets[1].data = diaData;
    
    pressureChartInstance.update();
}

// --- 8. Вспомогательная функция: Категории ВОЗ ---
function getCategory(sys, dia) {
    if (sys > 180 || dia > 110) {
        return { text: 'КРИТИЧЕСКОЕ', color: '#D32F2F', bg: '#FFEBEE' }; // Темно-красный
    }
    if (sys >= 140 || dia >= 90) {
        return { text: 'Гипертония', color: '#F57C00', bg: '#FFF3E0' }; // Оранжевый
    }
    if (sys >= 120 && sys < 140) {
        return { text: 'Повышенное', color: '#FBC02D', bg: '#FFFDE7' }; // Желтый
    }
    if (sys < 90 || dia < 60) {
        return { text: 'Низкое', color: '#1976D2', bg: '#E3F2FD' }; // Синий
    }
    return { text: 'Норма', color: '#388E3C', bg: '#E8F5E9' }; // Зеленый
}
