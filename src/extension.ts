import * as vscode from 'vscode';
import { exec } from 'child_process';
import * as util from 'util';

const execPromise = util.promisify(exec);

export function activate(context: vscode.ExtensionContext) {
    
    const disposable = vscode.commands.registerCommand(
        'gitHeroicommits.searchHeroicommits',
        async () => {
            const panel = vscode.window.createWebviewPanel(
                'heroicommits',
                'Heroicommits',
                vscode.ViewColumn.One,
                { enableScripts: true }
            );

            const scriptUri = panel.webview.asWebviewUri(
                vscode.Uri.joinPath(context.extensionUri, 'media', 'script.js')
            );

            const plottyCDNUri = vscode.Uri.parse(
                'https://cdn.plot.ly/plotly-latest.min.js'
            );

            panel.webview.html = getWebviewContent(scriptUri, plottyCDNUri);

            panel.webview.onDidReceiveMessage(async (msg) => {

                if (msg.command != 'searchHeroiCommits') 
                    return;
                                                            
                    const { desde, hasta } = msg;
                    try {
                        const workspaceFolders = vscode.workspace.workspaceFolders;
                        if (!workspaceFolders) {
                            panel.webview.postMessage({
                                type: 'error',
                                text: 'You must open a folder in VS Code'
                            });
                            return;


                        }
                                                
                        const repoPath = workspaceFolders[0].uri.fsPath;

                        //2025-07-18 00:18:35 -0300|OctavioBit FORMATO ISO
                        const gitCommand = `git log --since="${desde}" --until="${hasta}" --pretty=format:"%ad|%an" --date=iso`;                        
                        const { stdout } = await execPromise(gitCommand, { cwd: repoPath });                        
                        const lines = stdout.trim().split('\n').filter(Boolean);
                        let commitList: { dia: string; hora: number; author: string }[] = [];
                                                
                        for (const line of lines) {
                            const [fullDate, author] = line.split('|');
                            if (!fullDate || !author) continue;

                            const [date,time,zone] = fullDate.split(' ');
                            const [year,month,day] = date.split('-');

                            commitList.push({ dia: day, hora: horaAdecimal(time), author: author });
                        }

                        panel.webview.postMessage({
                            command: 'commitsData',
                            commitList
                        });
                    } catch (err: any) {
                        panel.webview.postMessage({
                            type: 'error',
                            text: `Error on searching for heroicommits: ${err.message}`
                        });
                    }                
            });
        }
    );

    context.subscriptions.push(disposable);
}

function horaAdecimal(hora: string): number {
    const [hh, mm, ss] = hora.split(":").map(Number);

    return hh + mm / 60 + (ss ?? 0) / 3600;
}

export function deactivate() { }

function getWebviewContent(scriptUri: vscode.Uri, plottyCDNUri: vscode.Uri): string {
    return /*html*/ `

    <head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Heroicommits</title>
    <style>
        body {
            font-family: sans-serif;
            padding: 20px;
            color: #ddd;
            background-color: #1e1e1e;
        }

        h2 {
            color: #61dafb;
        }

        label {
            display: block;
            margin-top: 10px;
        }

        input {
            background: #252526;
            color: #ddd;
            border: 1px solid #333;
            padding: 5px;
            border-radius: 4px;
            width: 200px;
        }

        button {
            margin-top: 15px;
            padding: 8px 16px;
            background: #007acc;
            border: none;
            color: white;
            border-radius: 4px;
            cursor: pointer;
        }

        button:hover {
            background: #005fa3;
        }

        #result {
            margin-top: 20px;
            font-weight: bold;
        }

        canvas {
            margin-top: 20px;
            background: #fff;
            border-radius: 8px;
        }
    </style>
</head>
<body>
    <h2>Heroicommits</h2>
    <table>
        <tr>
            <td><label>From: <input type="date" id="desde"></label></td>
            <td><label>to: <input type="date" id="hasta"></label></td>
            <td><button id="btnSearchHeroiCommits">Search HeroiCommits</button></td>
            <td><div id="selectAuthor"></div></td>
        </tr>
    </table>
    <div id="plot"></div>
    <style>
        table {
        border-collapse: separate;
        border-spacing: 15px; /* espacio entre celdas */
        }
    </style>
      <script>

        var commits = [];

        // Definir API VS Code
        const vscode = acquireVsCodeApi();

        // Enviar mensaje a la extensión
        document.getElementById("btnSearchHeroiCommits").addEventListener("click", () => {
          vscode.postMessage({
            command: "searchHeroiCommits",
            desde: document.getElementById("desde").value,
            hasta: document.getElementById("hasta").value
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

        function searchHeroiCommits() {
            createSelectAuthors();
            showHeroiCommits(commits);
        }

        function createSelectAuthors() {

            const onlyAuthors = [...new Set(commits.map(c => c.author))];
            var htmlSelect = \`<select name="Author" onchange="filterCommits(this)"> \`;
            for (let i = 0; i < onlyAuthors.length; i++) {
                htmlSelect += \`<option value=\` + onlyAuthors[i] +  \`>\` + onlyAuthors[i] + \`</option>\`;
            }

            htmlSelect += \`</select>\`;

            document.getElementById("selectAuthor").innerHTML = htmlSelect;
        }

        function isHeroicommit(commit){

            return commit.hora < 9  || 
                   commit.hora > 18 || 
                   esFinDeSemana(commit);
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
                color: allcommits.map(c => isHeroicommit(c) ? 'red': 'green'),
                opacity: 0.9,
                line: { color: '#000', width: 1 }
            },
            text: allcommits.map(c => {
                const hh = Math.floor(c.hora).toString().padStart(2, '0');
                const mm = Math.round((c.hora % 1) * 60).toString().padStart(2, '0');
                return hh + \`:\` + mm;
            }),
            hovertemplate: 'Día %{x}, Hora %{text}<extra></extra>'
        };

        // === FUNCIONES PARA SABADOS Y DOMINGOS ===
        const diasDelMes = Array.from({ length: 31 }, (_, i) => i + 1);
        const primerDiaSemana = 6; // 0=domingo, 1=lunes ... (ej: día 1 = miércoles)
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
            yaxis: { title: 'Hours', range: [0,23], tickvals: tickVals, ticktext: tickText },
            shapes: shapes,
            height: 600,
            hovermode: 'closest'
        };

        // === PLOTEAR ===
        Plotly.newPlot('plot', [trace], layout);
    }
    
    </script>

    <script src="${plottyCDNUri}"></script>
    </body>
    </html>
  `;
}
