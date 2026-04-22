import * as vscode from 'vscode';
import { HeroiCommitsWebviewProvider } from './webviewProvider';

export function activate(context: vscode.ExtensionContext) {

    const webviewProvider = new HeroiCommitsWebviewProvider(context);

    const disposable = vscode.commands.registerCommand(
        'gitHeroicommits.searchHeroicommits',
        async () => {
            await webviewProvider.show();
        }
    );

    const statusBarItem = vscode.window.createStatusBarItem(
        vscode.StatusBarAlignment.Right,
        100
    );

    statusBarItem.text = "•HeroiCommits•";
    statusBarItem.command = "gitHeroicommits.searchHeroicommits";
    statusBarItem.tooltip = "Search for Heroicommits";
    statusBarItem.show();

    context.subscriptions.push(disposable);
    context.subscriptions.push(statusBarItem);
}

export function deactivate() { }
