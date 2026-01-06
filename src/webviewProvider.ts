import * as vscode from 'vscode';
import { GitService } from './gitService';
import { WebviewMessage, CommitsDataMessage, ErrorMessage } from './types';

export class HeroiCommitsWebviewProvider {
    private panel: vscode.WebviewPanel | undefined;
    private gitService: GitService;

    constructor(private context: vscode.ExtensionContext) {
        this.gitService = new GitService();
    }

    /**
     * Show the HeroiCommits webview panel
     */
    public async show(): Promise<void> {
        if (this.panel) {
            this.panel.reveal(vscode.ViewColumn.One);
            return;
        }

        this.panel = vscode.window.createWebviewPanel(
            'heroicommits',
            '•HeroiCommits•',
            vscode.ViewColumn.One,
            {
                enableScripts: true,
                localResourceRoots: [
                    vscode.Uri.joinPath(this.context.extensionUri, 'media')
                ]
            }
        );

        this.panel.webview.html = await this.getWebviewContent();

        this.panel.webview.onDidReceiveMessage(
            async (message: WebviewMessage) => this.handleMessage(message),
            undefined,
            this.context.subscriptions
        );

        this.panel.onDidDispose(
            () => { this.panel = undefined; },
            undefined,
            this.context.subscriptions
        );
    }

    /**
     * Handle messages from the webview
     */
    private async handleMessage(message: WebviewMessage): Promise<void> {
        if (!this.panel) {
            return;
        }

        if (message.command !== 'searchHeroiCommits') {
            return;
        }

        const { dateFrom, dateUntil } = message;

        try {
            const workspaceFolders = vscode.workspace.workspaceFolders;
            if (!workspaceFolders) {
                this.postError('You must open a folder in VS Code');
                return;
            }

            const repoPath = workspaceFolders[0].uri.fsPath;
            const commitList = await this.gitService.getCommits(repoPath, dateFrom, dateUntil);

            const response: CommitsDataMessage = {
                command: 'commitsData',
                commitList
            };

            this.panel.webview.postMessage(response);

        } catch (err: any) {
            this.postError(`Error on searching for heroicommits: ${err.message}`);
        }
    }

    /**
     * Post error message to webview
     */
    private postError(text: string): void {
        if (!this.panel) {
            return;
        }

        const errorMsg: ErrorMessage = {
            type: 'error',
            text
        };

        this.panel.webview.postMessage(errorMsg);
    }

    /**
     * Get the webview HTML content
     */
    private async getWebviewContent(): Promise<string> {
        if (!this.panel) {
            return '';
        }

        // Read HTML file
        const htmlPath = vscode.Uri.joinPath(this.context.extensionUri, 'media', 'index.html');
        const htmlContent = await vscode.workspace.fs.readFile(htmlPath);
        let html = new TextDecoder().decode(htmlContent);

        // Get URIs for resources
        const scriptUri = this.panel.webview.asWebviewUri(
            vscode.Uri.joinPath(this.context.extensionUri, 'media', 'script.js')
        );

        const stylesUri = this.panel.webview.asWebviewUri(
            vscode.Uri.joinPath(this.context.extensionUri, 'media', 'styles.css')
        );

        const plottyCDNUri = vscode.Uri.parse(
            'https://cdn.plot.ly/plotly-latest.min.js'
        );

        // Replace placeholders
        html = html.replace('{{scriptUri}}', scriptUri.toString());
        html = html.replace('{{stylesUri}}', stylesUri.toString());
        html = html.replace('{{plottyCDNUri}}', plottyCDNUri.toString());

        return html;
    }
}
