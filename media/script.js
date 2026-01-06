// @ts-check
(function() {
    var commits = [];

    // Define VS Code API
    const vscode = acquireVsCodeApi();

    // Send message to extension
    document.getElementById("btnSearchHeroiCommits").addEventListener("click", () => {
        const dateFrom = document.getElementById("inputDateFrom").value;
        const dateUntil = document.getElementById("inputDateUntil").value;

        // Validation
        if (!dateFrom || !dateUntil) {
            alert("Please select both dates");
            return;
        }

        if (dateFrom > dateUntil) {
            alert("The 'From' date cannot be greater than 'Until' date");
            return;
        }

        vscode.postMessage({
            command: "searchHeroiCommits",
            dateFrom: dateFrom,
            dateUntil: dateUntil
        });
    });

    window.addEventListener("message", event => {
        const message = event.data;

        if (message.command != "commitsData") {
            return;
        }

        commits = message.commitList;
        searchHeroiCommits();
    });

    initializeDateInputs();

    function searchHeroiCommits() {
        createSelectAuthors();
        showHeroiCommits(commits);
    }

    function initializeDateInputs() {
        const today = new Date();
        const fifteenDaysAgo = new Date(today);
        fifteenDaysAgo.setDate(today.getDate() - 15);

        // Format YYYY-MM-DD
        const formatDate = (date) => {
            const year = date.getFullYear();
            const month = String(date.getMonth() + 1).padStart(2, '0');
            const day = String(date.getDate()).padStart(2, '0');
            return `${year}-${month}-${day}`;
        };

        const todayStr = formatDate(today);
        const fifteenDaysAgoStr = formatDate(fifteenDaysAgo);

        // Set default values
        document.getElementById("inputDateFrom").value = fifteenDaysAgoStr;
        document.getElementById("inputDateUntil").value = todayStr;

        // Set max (prevent future dates)
        document.getElementById("inputDateFrom").max = todayStr;
        document.getElementById("inputDateUntil").max = todayStr;
    }

    function createSelectAuthors() {
        const onlyAuthors = [...new Set(commits.map(c => c.author))];

        // Create select element safely
        const select = document.createElement('select');
        select.name = 'Author';
        select.onchange = function() { filterCommits(this); };

        // Add "All" option
        const allOption = document.createElement('option');
        allOption.value = '0';
        allOption.textContent = 'All';
        select.appendChild(allOption);

        // Add author options
        for (let i = 0; i < onlyAuthors.length; i++) {
            const option = document.createElement('option');
            option.value = onlyAuthors[i];
            option.textContent = onlyAuthors[i];
            select.appendChild(option);
        }

        // Clear and add to DOM safely
        const selectAuthorDiv = document.getElementById("selectAuthor");
        selectAuthorDiv.textContent = 'Author: ';
        selectAuthorDiv.appendChild(select);
    }

    window.filterCommits = function(selectAuthor) {
        var authorFilteredCommits = commits.filter(c => (c.author == selectAuthor.value) || (selectAuthor.value == "0"));
        showHeroiCommits(authorFilteredCommits);
    };

    function esFinDeSemana(fechaCompleta) {
        // fechaCompleta is string "YYYY-MM-DD"
        const [year, month, day] = fechaCompleta.split('-').map(Number);
        const fecha = new Date(year, month - 1, day);
        const diaSemana = fecha.getDay();
        return diaSemana === 0 || diaSemana === 6;
    }

    function isHeroicommit(commit) {
        return commit.hora < 9  ||
               commit.hora > 18 ||
               esFinDeSemana(commit.fecha);
    }

    function showHeroiCommits(allcommits) {
        const dateFrom = document.getElementById("inputDateFrom").value;
        const dateUntil = document.getElementById("inputDateUntil").value;

        // Parse dates
        const [yearFrom, monthFrom, dayFrom] = dateFrom.split('-').map(Number);
        const [yearUntil, monthUntil, dayUntil] = dateUntil.split('-').map(Number);

        // Calculate days in range
        const fechaDesde = new Date(yearFrom, monthFrom - 1, dayFrom);
        const fechaHasta = new Date(yearUntil, monthUntil - 1, dayUntil);
        const diferenciaMilis = fechaHasta - fechaDesde;
        const totalDias = Math.floor(diferenciaMilis / (1000 * 60 * 60 * 24)) + 1;

        // Generate list of all dates in range
        const todasLasFechas = [];
        for (let i = 0; i < totalDias; i++) {
            const fecha = new Date(fechaDesde);
            fecha.setDate(fechaDesde.getDate() + i);
            const year = fecha.getFullYear();
            const month = String(fecha.getMonth() + 1).padStart(2, '0');
            const day = String(fecha.getDate()).padStart(2, '0');
            todasLasFechas.push({
                fecha: fecha,
                fechaStr: `${year}-${month}-${day}`
            });
        }

        const trace = {
            x: allcommits.map(c => {
                // Find commit index in date range
                const commitFecha = c.fecha;
                const index = todasLasFechas.findIndex(item => item.fechaStr === commitFecha);
                return index + 1;  // Return 1-based position
            }),
            y: allcommits.map(c => c.hora),
            customdata: allcommits.map(c => c.author),
            mode: 'markers',
            type: 'scatter',
            marker: {
                size: 10,
                color: allcommits.map(c => isHeroicommit(c) ? 'red': 'green'),
                opacity: 0.9,
                line: { color: '#000', width: 1 }
            },
            text: allcommits.map(c => {
                const hh = Math.floor(c.hora).toString().padStart(2, '0');
                const mm = Math.round((c.hora % 1) * 60).toString().padStart(2, '0');
                return hh + `:` + mm;
            }),
            hovertemplate: '%{x} %{text} %{customdata} <extra></extra>'
        };

        // === SHAPES ===
        const shapes = [];

        // Time band 9-18
        shapes.push({
            type: 'rect',
            xref: 'paper',
            x0: 0, x1: 1,
            yref: 'y',
            y0: 9, y1: 18,
            fillcolor: 'rgba(255, 200, 0, 0.2)',
            line: { width: 0 }
        });

        // Weekend bands
        todasLasFechas.forEach((item, index) => {
            if (esFinDeSemana(item.fechaStr)) {
                shapes.push({
                    type: 'rect',
                    xref: 'x',
                    x0: index + 1 - 0.5,
                    x1: index + 1 + 0.5,
                    yref: 'paper',
                    y0: 0,
                    y1: 1,
                    fillcolor: 'rgba(200, 200, 200, 0.3)',
                    line: { width: 0 }
                });
            }
        });

        const tickVals = [];
        const tickText = [];
        for (let h = 0; h <= 23; h++) {
            tickVals.push(h);
            tickText.push(h.toString().padStart(2, '0') + ':00');
        }

        // X-axis
        let datesVal = [];
        let datesText = [];

        todasLasFechas.forEach((item, index) => {
            datesVal.push(index + 1);  // X-axis position (1-based)
            datesText.push(item.fecha.toLocaleDateString('es-ES', {
                day: '2-digit',
                month: '2-digit',
                year: 'numeric'
            }));
        });

        const xaxis = {
            title: 'Days',
            range: [0.5, totalDias + 0.5],
            automargin: true,
            tickvals: datesVal,
            ticktext: datesText,
            tickangle: 45
        };

        // === LAYOUT ===
        const layout = {
            title: 'Gray: Weekends - Yellow: Laboral Time',
            template: 'plotly_dark',
            xaxis: xaxis,
            yaxis: { title: 'Hours', range: [0,23], tickvals: tickVals, ticktext: tickText },
            shapes: shapes,
            height: 600,
            hovermode: 'closest'
        };

        // === PLOT ===
        Plotly.newPlot('plot', [trace], layout);

        // Update total using textContent (safe)
        const heroiCount = allcommits.filter(c => isHeroicommit(c)).length;
        document.getElementById("totalHeroicommits").textContent = "Found: " + heroiCount + " Heroicommits";
    }
})();
