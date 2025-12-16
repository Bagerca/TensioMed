// Инициализация пустых массивов для данных
let bpData = [
    // Стартовые (фиктивные) данные для примера, чтобы график не был пустым
    { date: '10:00', sys: 120, dia: 80, pulse: 65 },
    { date: '14:00', sys: 125, dia: 82, pulse: 70 },
    { date: '18:00', sys: 118, dia: 78, pulse: 60 },
];

// --- 1. Настройка графика Chart.js ---
const ctx = document.getElementById('pressureChart').getContext('2d');

const chartConfig = {
    type: 'line',
    data: {
        labels: bpData.map(d => d.date),
        datasets: [
            {
                label: 'Систолическое (SYS)',
                data: bpData.map(d => d.sys),
                borderColor: '#E53935', // Красный
                backgroundColor: 'rgba(229, 57, 53, 0.1)',
                borderWidth: 2,
                pointRadius: 4,
                pointBackgroundColor: '#fff',
                pointBorderColor: '#E53935',
                tension: 0.4, // Плавность линий
                fill: true
            },
            {
                label: 'Диастолическое (DIA)',
                data: bpData.map(d => d.dia),
                borderColor: '#2C3E50', // Темно-синий
                backgroundColor: 'transparent',
                borderWidth: 2,
                pointRadius: 4,
                pointBackgroundColor: '#fff',
                pointBorderColor: '#2C3E50',
                borderDash: [5, 5], // Пунктирная линия для нижнего давления
                tension: 0.4
            }
        ]
    },
    options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: { display: false } // Легенду мы сверстали сами в HTML
        },
        scales: {
            y: {
                beginAtZero: false,
                suggestedMin: 50,
                suggestedMax: 180,
                grid: {
                    color: '#F0F0F0'
                }
            },
            x: {
                grid: {
                    display: false
                }
            }
        }
    }
};

const myChart = new Chart(ctx, chartConfig);

// --- 2. Логика формы и обновления ---

const form = document.getElementById('bpForm');
const historyTable = document.getElementById('historyTableBody');
const statusDisplay = document.getElementById('statusDisplay');

// Функция определения категории давления (по ВОЗ упрощенно)
function getCategory(sys, dia) {
    if (sys > 180 || dia > 120) return { text: 'ГИПЕРТОНИЧЕСКИЙ КРИЗ', color: '#D32F2F', bg: '#FFEBEE' };
    if (sys >= 140 || dia >= 90) return { text: 'Гипертония', color: '#FB8C00', bg: '#FFF3E0' };
    if (sys >= 120 && sys < 140) return { text: 'Нормальное повышенное', color: '#FBC02D', bg: '#FFFDE7' };
    return { text: 'Оптимальное', color: '#43A047', bg: '#E8F5E9' };
}

// Рендер таблицы
function renderTable() {
    historyTable.innerHTML = '';
    // Берем последние 5 записей, переворачиваем для новизны сверху
    const reversedData = [...bpData].reverse();
    
    reversedData.forEach(item => {
        const cat = getCategory(item.sys, item.dia);
        const row = `
            <tr>
                <td>${item.date}</td>
                <td><strong>${item.sys} / ${item.dia}</strong></td>
                <td>${item.pulse} <span style="font-size:12px; color:#999">уд/м</span></td>
                <td><span style="color:${cat.color}; font-weight:600;">${cat.text}</span></td>
            </tr>
        `;
        historyTable.innerHTML += row;
    });
}

// Обработка отправки формы
form.addEventListener('submit', (e) => {
    e.preventDefault();

    const sys = parseInt(document.getElementById('sysInput').value);
    const dia = parseInt(document.getElementById('diaInput').value);
    const pulse = parseInt(document.getElementById('pulseInput').value);
    
    const now = new Date();
    const timeString = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    // Добавляем данные
    const newData = { date: timeString, sys, dia, pulse };
    bpData.push(newData);

    // Обновляем График
    myChart.data.labels.push(timeString);
    myChart.data.datasets[0].data.push(sys);
    myChart.data.datasets[1].data.push(dia);
    myChart.update();

    // Обновляем Блок Статуса
    const cat = getCategory(sys, dia);
    statusDisplay.innerHTML = `
        <div class="bp-big-number">${sys} / ${dia}</div>
        <div class="bp-label" style="background:${cat.bg}; color:${cat.color}">
            ${cat.text}
        </div>
        <div style="margin-top:10px; color:#777;">Пульс: ${pulse}</div>
    `;

    // Обновляем таблицу
    renderTable();

    // Очистка полей
    form.reset();
});

// Первичный рендер при загрузке
renderTable();
