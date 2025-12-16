/**
 * CardioLog - Script v2
 * Добавлена поддержка дат, пропусков и тёмная тема
 */

const AppState = {
    userName: "Пользователь",
    isDarkMode: false,
    records: []
};

let pressureChartInstance = null;

// --- Инициализация ---
document.addEventListener('DOMContentLoaded', () => {
    loadData();
    initChart();
    renderApp();
    
    // Устанавливаем текущую дату в поле ввода по умолчанию
    setDefaultDate();

    // Слушатели событий
    const form = document.getElementById('bpForm');
    if (form) form.addEventListener('submit', handleFormSubmit);

    // Слушатель темы
    const themeToggle = document.getElementById('themeToggle');
    if (themeToggle) {
        themeToggle.checked = AppState.isDarkMode;
        themeToggle.addEventListener('change', toggleTheme);
    }
});

function setDefaultDate() {
    const now = new Date();
    // Формат для input type="datetime-local" должен быть YYYY-MM-DDTHH:MM
    now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
    document.getElementById('dateInput').value = now.toISOString().slice(0, 16);
}

// --- Хранилище ---
function saveData() {
    localStorage.setItem('cardioLogData_v2', JSON.stringify(AppState));
    renderApp();
}

function loadData() {
    const rawData = localStorage.getItem('cardioLogData_v2');
    if (rawData) {
        const parsed = JSON.parse(rawData);
        AppState.userName = parsed.userName || "Пользователь";
        AppState.records = parsed.records || [];
        AppState.isDarkMode = parsed.isDarkMode || false;
    }
    // Применяем тему сразу
    applyTheme();
}

function clearAllData() {
    if (confirm("Удалить всю историю?")) {
        AppState.records = [];
        saveData();
    }
}

// --- Тёмная тема ---
function toggleTheme(e) {
    AppState.isDarkMode = e.target.checked;
    applyTheme();
    saveData(); // Сохраняем настройку
}

function applyTheme() {
    if (AppState.isDarkMode) {
        document.body.classList.add('dark-mode');
    } else {
        document.body.classList.remove('dark-mode');
    }
}

// --- Логика формы ---
function handleFormSubmit(e) {
    e.preventDefault();

    const dateVal = document.getElementById('dateInput').value;
    const sysVal = document.getElementById('sysInput').value;
    const diaVal = document.getElementById('diaInput').value; // Может быть пустым
    const pulseVal = document.getElementById('pulseInput').value; // Может быть пустым
    const noteVal = document.getElementById('noteInput').value;

    if (!sysVal) {
        alert("Укажите хотя бы верхнее давление (SYS)");
        return;
    }

    // Создаем дату из инпута
    const recordDate = new Date(dateVal);

    const newRecord = {
        id: Date.now(),
        timestamp: recordDate.getTime(),
        // Сохраняем значения или null, если пусто
        sys: parseInt(sysVal),
        dia: diaVal ? parseInt(diaVal) : null,
        pulse: pulseVal ? parseInt(pulseVal) : null,
        note: noteVal || ""
    };

    AppState.records.push(newRecord);
    saveData();

    e.target.reset();
    setDefaultDate(); // Возвращаем дату на текущую
}

function deleteRecord(id) {
    if (confirm("Удалить запись?")) {
        AppState.records = AppState.records.filter(r => r.id !== id);
        saveData();
    }
}

// --- Интерфейс ---
function switchTab(tabId) {
    document.querySelectorAll('.tab-content').forEach(el => el.classList.remove('active-tab'));
    document.querySelectorAll('.nav-btn').forEach(btn => btn.classList.remove('active'));
    document.getElementById(tabId).classList.add('active-tab');
    
    // Подсветка кнопки (простая)
    const btns = document.querySelectorAll('.nav-btn');
    if (tabId === 'dashboard') btns[0].classList.add('active');
    if (tabId === 'history') btns[1].classList.add('active');
    if (tabId === 'settings') btns[2].classList.add('active');
}

function editName() {
    switchTab('settings');
    document.getElementById('settingsNameInput').value = AppState.userName;
}

function saveSettings() {
    const input = document.getElementById('settingsNameInput');
    if (input.value.trim()) {
        AppState.userName = input.value.trim();
        saveData();
        alert("Сохранено");
    }
}

// --- Рендер ---
function renderApp() {
    document.getElementById('userNameDisplay').innerText = AppState.userName;

    // Сортируем записи
    const sortedForChart = [...AppState.records].sort((a, b) => a.timestamp - b.timestamp);
    const sortedForTable = [...AppState.records].sort((a, b) => b.timestamp - a.timestamp);

    renderStatusWidget(sortedForChart);
    renderHistoryTable(sortedForTable);
    updateChart(sortedForChart);
}

function renderStatusWidget(records) {
    const statusDiv = document.getElementById('statusDisplay');
    if (records.length === 0) {
        statusDiv.innerHTML = `<span class="text-muted">Нет данных</span>`;
        return;
    }

    const last = records[records.length - 1];
    // Если нижнего нет, показываем прочерк
    const diaDisplay = last.dia ? last.dia : '-';
    const cat = getCategory(last.sys, last.dia || 80); // Если диа нет, оцениваем только по сис

    // Форматируем дату красиво для виджета
    const dateObj = new Date(last.timestamp);
    const dateStr = dateObj.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });

    statusDiv.innerHTML = `
        <div class="bp-big" style="color: ${cat.color}">${last.sys} / ${diaDisplay}</div>
        <div class="badge" style="background: ${cat.bg}; color: ${cat.color}; margin-top:5px;">${cat.text}</div>
        <div style="margin-top: 10px; color: var(--text-muted); font-size: 14px;">
            Пульс: <b>${last.pulse || '-'}</b> • ${dateStr}
        </div>
    `;
}

function renderHistoryTable(records) {
    const tbody = document.getElementById('fullHistoryBody');
    tbody.innerHTML = '';

    records.forEach(rec => {
        const dateObj = new Date(rec.timestamp);
        const dateStr = dateObj.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' });
        const timeStr = dateObj.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        
        const diaDisplay = rec.dia ? rec.dia : '-';
        const pulseDisplay = rec.pulse ? rec.pulse : '-';
        const cat = getCategory(rec.sys, rec.dia || 80);

        const row = document.createElement('tr');
        row.innerHTML = `
            <td><div>${dateStr}</div><div style="font-size:12px; color:var(--text-muted)">${timeStr}</div></td>
            <td><b>${rec.sys} / ${diaDisplay}</b></td>
            <td>${pulseDisplay}</td>
            <td><span class="badge" style="background:${cat.bg}; color:${cat.color}">${cat.text}</span></td>
            <td style="color:var(--text-muted); font-size:13px;">${rec.note}</td>
            <td><button class="btn-delete" onclick="deleteRecord(${rec.id})">✕</button></td>
        `;
        tbody.appendChild(row);
    });
}

// --- График ---
function initChart() {
    const ctx = document.getElementById('pressureChart');
    if(!ctx) return;
    
    // Получаем стили из CSS переменных для правильного цвета в темной теме
    const style = getComputedStyle(document.body);
    const gridColor = style.getPropertyValue('--border-color').trim();

    pressureChartInstance = new Chart(ctx, {
        type: 'line',
        data: { labels: [], datasets: [] },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            spanGaps: false, // Разрывать линию, если нет данных (dia = null)
            plugins: { legend: { display: false } },
            scales: {
                y: { grid: { color: gridColor }, suggestedMin: 60, suggestedMax: 160 },
                x: { grid: { display: false } }
            }
        }
    });
}

function updateChart(records) {
    if (!pressureChartInstance) return;
    
    // Берем последние 15 записей
    const recent = records.slice(-15);
    
    const labels = recent.map(r => {
        const d = new Date(r.timestamp);
        return d.toLocaleDateString('ru-RU', { day: 'numeric', month: 'numeric' });
    });

    pressureChartInstance.data.labels = labels;
    
    // SYS Data
    pressureChartInstance.data.datasets[0] = {
        label: 'SYS',
        data: recent.map(r => r.sys),
        borderColor: '#E53935',
        backgroundColor: 'rgba(229, 57, 53, 0.1)',
        borderWidth: 3,
        pointBackgroundColor: '#fff',
        pointBorderColor: '#E53935',
        tension: 0.3,
        fill: true
    };

    // DIA Data (может содержать null)
    const style = getComputedStyle(document.body);
    const diaColor = style.getPropertyValue('--text-dark').trim();

    pressureChartInstance.data.datasets[1] = {
        label: 'DIA',
        data: recent.map(r => r.dia), // null сработает корректно
        borderColor: diaColor,
        backgroundColor: 'transparent',
        borderWidth: 2,
        borderDash: [5, 5],
        tension: 0.3,
        pointRadius: 3
    };

    // Обновляем цвет сетки при смене темы
    const gridColor = style.getPropertyValue('--border-color').trim();
    pressureChartInstance.options.scales.y.grid.color = gridColor;

    pressureChartInstance.update();
}

function getCategory(sys, dia) {
    if (sys > 180 || dia > 110) return { text: 'КРИТИЧЕСКОЕ', color: '#D32F2F', bg: '#FFEBEE' };
    if (sys >= 140 || dia >= 90) return { text: 'Гипертония', color: '#F57C00', bg: '#FFF3E0' };
    if (sys >= 120) return { text: 'Повышенное', color: '#FBC02D', bg: '#FFFDE7' };
    return { text: 'Норма', color: '#388E3C', bg: '#E8F5E9' };
}
