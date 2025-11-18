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

                if (msg.command === 'count') {

                    vscode.window.showInformationMessage("Hola desde VS Code!" + msg.text);

                    panel.webview.postMessage({
                        command: "processedText",
                        text: "Hola desde VS Code!" + msg.text
                    });
                    
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
                        const data: Record<string, Record<string, number>> = {};

                        vscode.window.showInformationMessage(gitCommand);

                        for (const line of lines) {
                            const [date, author] = line.split('|');
                            if (!date || !author) continue;
                            if (!data[date]) data[date] = {};
                            data[date][author] = (data[date][author] || 0) + 1;
                        }
                        
                        panel.webview.postMessage({
                            type: 'commitsData',
                            data
                        });
                    } catch (err: any) {
                        panel.webview.postMessage({
                            type: 'error',
                            text: `Error on searching for heroicommits: ${err.message}`
                        });
                    }
                }
            });
        }
    );

    context.subscriptions.push(disposable);
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
    <label>From: <input type="date" id="desde"></label>
    <label>to: <input type="date" id="hasta"></label>
    <button onclick="searchHeroiCommits()">Search for Heroicommits</button>
    <div id="result"></div>
    <div id="selectAuthor"></div>
    <div id="plot"></div>
    <div id="output"></div>

    <button id="btn">Mostrar Hola</button>

      <script>
        // Definir API VS Code
        const vscode = acquireVsCodeApi();

        // Enviar mensaje a la extensión
        document.getElementById("btn").addEventListener("click", () => {
          vscode.postMessage({
            command: "count",
            text: "el dato",
            desde: document.getElementById("desde").value,
            hasta: document.getElementById("hasta").value
          });
        });

        //Recibir mensaje desde la extension
        window.addEventListener("message", event => {
            const message = event.data;

            if (message.command === "processedText") {
                document.getElementById("output").innerText =
                    "Resultado desde la extensión: " + message.text;
            }

            if (message.command === "commitsData") {
                document.getElementById("output").innerText =
                    message.data
            }
        });

      </script>

      
      <script src="${plottyCDNUri}"></script>
      <script src="${scriptUri}"></script>
    </body>
    </html>
  `;
}
