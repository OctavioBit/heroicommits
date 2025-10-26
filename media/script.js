var commits = [];

function searchHeroiCommits() {
    console.log("Entro");
    getCommitsData();
    createSelectAuthors();
    showHeroiCommits(commits);
}

function showHeroiCommits(allcommits) {
    // === TRAZA DE COMMITS ===
    const trace = {
        x: allcommits.map(c => c.dia),
        y: allcommits.map(c => c.hora),
        mode: 'markers',
        type: 'scatter',
        marker: {
            size: 10,
            color: '#1f77b4',
            opacity: 0.9,
            line: { color: '#000', width: 1 }
        },
        text: allcommits.map(c => {
            const hh = Math.floor(c.hora).toString().padStart(2, '0');
            const mm = Math.round((c.hora % 1) * 60).toString().padStart(2, '0');
            return `${hh}:${mm}`;
        }),
        hovertemplate: 'Día %{x}, Hora %{text}<extra></extra>'
    };

    // === FUNCIONES PARA SABADOS Y DOMINGOS ===
    const diasDelMes = Array.from({ length: 31 }, (_, i) => i + 1);
    const primerDiaSemana = 3; // 0=domingo, 1=lunes ... (ej: día 1 = miércoles)
    function esFinDeSemana(dia) {
        const diaSemana = (primerDiaSemana + (dia - 1)) % 7;
        return diaSemana === 0 || diaSemana === 6;
    }

    // === SHAPES ===
    const shapes = [];

    // Franja horaria 9-18
    shapes.push({
        type: 'rect',
        xref: 'paper',
        x0: 0, x1: 1,
        yref: 'y',
        y0: 9, y1: 18,
        fillcolor: 'rgba(255, 200, 0, 0.2)',
        line: { width: 0 }
    });

    // Franjas de sábados y domingos
    diasDelMes.forEach(dia => {
        if (esFinDeSemana(dia)) {
            shapes.push({
                type: 'rect',
                xref: 'x',
                x0: dia - 0.5,
                x1: dia + 0.5,
                yref: 'paper',
                y0: 0,
                y1: 1,
                fillcolor: 'rgba(200, 200, 200, 0.3)',
                line: { width: 0 }
            });
        }
    });

    // === CONFIGURAR EJE Y CON FORMATO HH:MM ===
    const tickVals = [];
    const tickText = [];
    for (let h = 0; h <= 23; h++) {
        tickVals.push(h);
        tickText.push(h.toString().padStart(2, '0') + ':00');
    }

    //Eje X
    let datesVal = [];
    let datesText = [];
    const fechaDesde = new Date(2025, 8, 2);
    const fechaHasta = new Date(2025, 8, 30);
    const dayFrom = fechaDesde.getDay();
    const diferenciaMilis = fechaHasta - fechaDesde;
    const dias = diferenciaMilis / (1000 * 60 * 60 * 24);

    var currentDate = new Date(fechaDesde);
    datesVal.push(currentDate.getDate());
    datesText.push(currentDate.toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' }));

    for (let d = 0; d <= dias; d++) {

        currentDate.setDate(currentDate.getDate() + 1);
        datesVal.push(currentDate.getDate());
        datesText.push(currentDate.toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' }));
    }

    const xaxis = {
        title: 'Days',
        range: [fechaDesde.getDate(), fechaHasta.getDate()],
        automargin: true,
        tickvals: datesVal,
        ticktext: datesText,
        tickangle: 45,
        dtick: 24 * 60 * 60 * 1000
    };

    // === LAYOUT ===
    const layout = {
        title: 'Commits por día y hora (con franjas y fines de semana)',
        xaxis: xaxis,
        yaxis: { title: 'Hours', range: [0, 23], tickvals: tickVals, ticktext: tickText },
        shapes: shapes,
        height: 600,
        hovermode: 'closest'
    };

    // === PLOTEAR ===
    Plotly.newPlot('plot', [trace], layout);
}

function createSelectAuthors() {

    const onlyAuthors = [...new Set(commits.map(c => c.author))];

    var htmlSelect = `<select name="Author" onchange="filterCommits(this)">`;

    for (let i = 0; i < onlyAuthors.length; i++) {
        htmlSelect += `<option value=${onlyAuthors[i]}>${onlyAuthors[i]}</option>`;
    }

    htmlSelect += `</select>`;

    document.getElementById("selectAuthor").innerHTML = htmlSelect;
}

function filterCommits(select) {
    showHeroiCommits(commits.filter(c => c.author == select.value));
}

function getCommitsData() {

    commits = [
        { dia: 8, hora: 14, author: 'Anton' },
        { dia: 8, hora: 14.25, author: 'Anton' }, // 14:15
        { dia: 8, hora: 15, author: 'Anton' },
        { dia: 8, hora: 14, author: 'Uxia' },
        { dia: 9, hora: 14.25, author: 'Uxia' }, // 14:15
        { dia: 9, hora: 15, author: 'Uxia' },
        { dia: 10, hora: 14, author: 'PisPas' },
        { dia: 11, hora: 14.25, author: 'PisPas' }, // 14:15
        { dia: 5, hora: 15, author: 'Anton' },
        { dia: 15, hora: 14, author: 'Anton' },
        { dia: 20, hora: 14.25, author: 'Anton' }, // 14:15
        { dia: 23, hora: 15, author: 'Anton' },
        { dia: 21, hora: 0, author: 'Uxia' },
        { dia: 21, hora: 19, author: 'Uxia' },
        { dia: 22, hora: 21, author: 'Anton' },
        { dia: 21, hora: 19.25, author: 'Anton' } // 19:15
    ];
}