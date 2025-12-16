const AppState = {
    userName: "Пользователь",
    isDarkMode: false,
    records: []
};

let pressureChartInstance = null;

document.addEventListener('DOMContentLoaded', () => {
    loadData();
    initChart();
    renderApp();
    setDefaultDate();

    document.getElementById('bpForm').addEventListener('submit', handleFormSubmit);
    
    const toggle = document.getElementById('themeToggle');
    if(toggle) {
        toggle.checked = AppState.isDarkMode;
        toggle.addEventListener('change', (e) => toggleTheme(e.target.checked));
    }
});

function setDefaultDate() {
    const now = new Date();
    now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
    document.getElementById('dateInput').value = now.toISOString().slice(0, 16);
}

function saveData() {
    localStorage.setItem('cardioPro_v2', JSON.stringify(AppState));
    renderApp();
}

function loadData() {
    const rawData = localStorage.getItem('cardioPro_v2');
    if (rawData) {
        const parsed = JSON.parse(rawData);
        AppState.userName = parsed.userName || "Пользователь";
        AppState.records = parsed.records || [];
        AppState.isDarkMode = parsed.isDarkMode || false;
    }
    applyTheme(AppState.isDarkMode);
}

function clearAllData() {
    if (confirm("Вы уверены? История будет удалена.")) {
        AppState.records = [];
        saveData();
    }
}

function toggleTheme(isChecked) {
    AppState.isDarkMode = isChecked;
    applyTheme(isChecked);
    saveData();
    updateChartTheme();
}

function applyTheme(isDark) {
    if (isDark) document.body.classList.add('dark-mode');
    else document.body.classList.remove('dark-mode');
}

function handleFormSubmit(e) {
    e.preventDefault();
    const dateVal = document.getElementById('dateInput').value;
    const sys = document.getElementById('sysInput').value;
    const dia = document.getElementById('diaInput').value;
    const pulse = document.getElementById('pulseInput').value;
    const note = document.getElementById('noteInput').value;

    if (!sys) return;

    const newRecord = {
        id: Date.now(),
        timestamp: new Date(dateVal).getTime(),
        sys: parseInt(sys),
        dia: dia ? parseInt(dia) : null,
        pulse: pulse ? parseInt(pulse) : null,
        note: note || ""
    };

    AppState.records.push(newRecord);
    saveData();
    e.target.reset();
    setDefaultDate();
}

function deleteRecord(id) {
    if(confirm("Удалить?")) {
        AppState.records = AppState.records.filter(r => r.id !== id);
        saveData();
    }
}

function switchTab(tabId) {
    // Скрываем все вкладки
    document.querySelectorAll('.tab-content').forEach(el => el.classList.remove('active-tab'));
    document.querySelectorAll('.nav-btn').forEach(el => el.classList.remove('active'));
    
    // Показываем нужную
    document.getElementById(tabId).classList.add('active-tab');
    
    // Подсветка кнопок
    const btns = document.querySelectorAll('.nav-btn');
    if(tabId === 'dashboard') btns[0].classList.add('active');
    if(tabId === 'history') btns[1].classList.add('active');
    if(tabId === 'settings') btns[2].classList.add('active');
}

function editName() {
    switchTab('settings');
    document.getElementById('settingsNameInput').value = AppState.userName;
}

function saveSettings() {
    const val = document.getElementById('settingsNameInput').value;
    if(val.trim()) {
        AppState.userName = val.trim();
        saveData();
        alert('Сохранено');
    }
}

function renderApp() {
    document.getElementById('userNameDisplay').innerText = AppState.userName;

    const sortedForChart = [...AppState.records].sort((a,b) => a.timestamp - b.timestamp);
    const sortedForTable = [...AppState.records].sort((a,b) => b.timestamp - a.timestamp);

    renderStatus(sortedForChart);
    renderTable(sortedForTable);
    updateChartData(sortedForChart);
}

function renderStatus(records) {
    const div = document.getElementById('statusDisplay');
    if (records.length === 0) {
        div.innerHTML = `<span style="color:var(--text-muted)">Нет данных</span>`;
        return;
    }
    const last = records[records.length - 1];
    const cat = getCategory(last.sys, last.dia || 80);
    const diaDisplay = last.dia ? last.dia : '--';

    div.innerHTML = `
        <div class="bp-big" style="color: ${cat.color}">${last.sys}<span style="font-size:30px; color:var(--text-muted)">/</span>${diaDisplay}</div>
        <div class="bp-label" style="background:${cat.bg}; color:${cat.textCol}">${cat.text}</div>
        <div style="margin-top:12px; font-size:14px; color:var(--text-muted)">
            Пульс: <strong style="color:var(--text-main)">${last.pulse || '--'}</strong>
        </div>
    `;
}

function renderTable(records) {
    const tbody = document.getElementById('fullHistoryBody');
    tbody.innerHTML = '';
    
    records.forEach(r => {
        const d = new Date(r.timestamp);
        const dateStr = d.toLocaleDateString('ru-RU', {day:'numeric', month:'short'});
        const timeStr = d.toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'});
        const cat = getCategory(r.sys, r.dia || 80);

        const row = `
            <tr>
                <td><b>${dateStr}</b> <span style="color:var(--text-muted); font-size:12px; margin-left:5px">${timeStr}</span></td>
                <td><span style="font-weight:700; font-size:16px">${r.sys}</span> / ${r.dia || '--'}</td>
                <td>${r.pulse || '-'}</td>
                <td><span style="color:${cat.color}; font-weight:600; font-size:12px">● ${cat.text}</span></td>
                <td style="color:var(--text-muted); font-size:13px">${r.note}</td>
                <td><button class="btn-delete" onclick="deleteRecord(${r.id})">✕</button></td>
            </tr>
        `;
        tbody.innerHTML += row;
    });
}

function initChart() {
    const ctx = document.getElementById('pressureChart');
    if(!ctx) return;
    const styles = getComputedStyle(document.body);
    const gridColor = styles.getPropertyValue('--border').trim();
    const textColor = styles.getPropertyValue('--text-muted').trim();

    pressureChartInstance = new Chart(ctx, {
        type: 'line',
        data: { labels: [], datasets: [] },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            interaction: { mode: 'index', intersect: false },
            plugins: { legend: { display: false } },
            scales: {
                x: { grid: { display: false }, ticks: { color: textColor } },
                y: { grid: { color: gridColor }, ticks: { color: textColor }, suggestedMin: 50, suggestedMax: 160 }
            }
        }
    });
}

function updateChartTheme() {
    if(!pressureChartInstance) return;
    const styles = getComputedStyle(document.body);
    const gridColor = styles.getPropertyValue('--border').trim();
    const textColor = styles.getPropertyValue('--text-muted').trim();

    pressureChartInstance.options.scales.y.grid.color = gridColor;
    pressureChartInstance.options.scales.y.ticks.color = textColor;
    pressureChartInstance.options.scales.x.ticks.color = textColor;
    pressureChartInstance.update();
}

function updateChartData(records) {
    if(!pressureChartInstance) return;
    const recent = records.slice(-10);

    pressureChartInstance.data.labels = recent.map(r => new Date(r.timestamp).toLocaleDateString('ru-RU', {day:'numeric', month:'numeric'}));
    pressureChartInstance.data.datasets = [
        {
            label: 'SYS', data: recent.map(r => r.sys),
            borderColor: '#E53935', backgroundColor: 'rgba(229, 57, 53, 0.1)',
            borderWidth: 3, tension: 0.4, fill: true, pointRadius: 4, pointBackgroundColor: '#fff', pointBorderColor: '#E53935'
        },
        {
            label: 'DIA', data: recent.map(r => r.dia),
            borderColor: AppState.isDarkMode ? '#9E9E9E' : '#667085',
            borderWidth: 2, borderDash: [6, 6], tension: 0.4, pointRadius: 0
        }
    ];
    updateChartTheme();
}

function getCategory(sys, dia) {
    if (sys > 180 || dia > 110) return { text: 'КРИЗ', color: '#F04438', bg: '#FEF3F2', textCol: '#B42318' };
    if (sys >= 140 || dia >= 90) return { text: 'Высокое', color: '#F79009', bg: '#FFFAEB', textCol: '#B54708' };
    if (sys >= 120) return { text: 'Повышенное', color: '#FDB022', bg: '#FFFAEB', textCol: '#B54708' };
    return { text: 'Норма', color: '#12B76A', bg: '#ECFDF3', textCol: '#027A48' };
}
