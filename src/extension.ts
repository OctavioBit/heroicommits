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
                vscode.Uri.joinPath(context.extensionUri, 'media', 'webview.js')
            );

            const chartUri = vscode.Uri.parse(
                'https://cdn.jsdelivr.net/npm/chart.js'
            );

            panel.webview.html = getWebviewContent(scriptUri, chartUri);

            panel.webview.onDidReceiveMessage(async (msg) => {

                if (msg.command === 'count') {

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
                        const { stdout } = await execPromise(
                            `git log --since="${desde}" --until="${hasta}" --pretty=format:"%ad|%an" --date=short`,
                            { cwd: repoPath }
                        );

                        const lines = stdout.trim().split('\n').filter(Boolean);
                        const data: Record<string, Record<string, number>> = {};

                        for (const line of lines) {
                            const [date, author] = line.split('|');
                            if (!date || !author) continue;
                            if (!data[date]) data[date] = {};
                            data[date][author] = (data[date][author] || 0) + 1;
                        }

                        panel.webview.postMessage({
                            type: 'chartData',
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

function getWebviewContent(scriptUri: vscode.Uri, chartUri: vscode.Uri): string {
    return /*html*/ `
    <!DOCTYPE html>
    <html lang="es">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Gráfico de commits</title>
      <style>
        body {
          font-family: sans-serif;
          padding: 20px;
          color: #ddd;
          background-color: #1e1e1e;
        }
        h2 { color: #61dafb; }
        label { display: block; margin-top: 10px; }
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
        button:hover { background: #005fa3; }
        #result { margin-top: 20px; font-weight: bold; }
        canvas { margin-top: 20px; background: #fff; border-radius: 8px; }
      </style>
    </head>
    <body>
      <h2>Commits por día y autor</h2>
      <label>Desde: <input type="date" id="desde"></label>
      <label>Hasta: <input type="date" id="hasta"></label>
      <button id="btnCount">Generar gráfico</button>
      <div id="result"></div>
      <canvas id="chart" width="800" height="400"></canvas>

      
      <script src="${chartUri}"></script>
      <script src="${scriptUri}"></script>
    </body>
    </html>
  `;
}
