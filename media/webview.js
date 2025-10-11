const vscode = acquireVsCodeApi();
let chart;

document.getElementById('btnCount').addEventListener('click', () => {
    const desde = document.getElementById('desde').value;
    const hasta = document.getElementById('hasta').value;

    if (!desde || !hasta) {
        setResult('⚠️ Ingresá ambas fechas.');
        return;
    }

    vscode.postMessage({ command: 'count', desde, hasta });
});

window.addEventListener('message', (event) => {
    const msg = event.data;

    if (msg.type === 'chartData') {
        setResult('');
        renderChart(msg.data);
    } else if (msg.type === 'error') {
        setResult('❌ ' + msg.text);
    }
});

function setResult(text) {
    document.getElementById('result').innerText = text;
}

function renderChart(data) {
    const ctx = document.getElementById('chart').getContext('2d');
    const dates = Object.keys(data).sort();
    const authors = Array.from(new Set(dates.flatMap(d => Object.keys(data[d]))));

    const datasets = authors.map((author, idx) => ({
        label: author,
        data: dates.map(d => data[d][author] || 0),
        backgroundColor: randomColor(idx)
    }));

    if (chart) chart.destroy();

    chart = new Chart(ctx, {
        type: 'bar',
        data: { labels: dates, datasets },
        options: {
            responsive: true,
            plugins: {
                legend: { position: 'bottom' },
            },
            scales: {
                x: { title: { display: true, text: 'Fecha' } },
                y: { title: { display: true, text: 'Commits' }, beginAtZero: true }
            }
        }
    });
}

function randomColor(i) {
    const hue = (i * 137) % 360;
    return `hsl(${hue}, 70%, 60%)`;
}
