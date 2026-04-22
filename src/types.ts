export interface Commit {
    fecha: string;
    dia: string;
    hora: number;
    author: string;
}

export interface SearchHeroiCommitsMessage {
    command: 'searchHeroiCommits';
    dateFrom: string;
    dateUntil: string;
}

export interface CommitsDataMessage {
    command: 'commitsData';
    commitList: Commit[];
}

export interface ErrorMessage {
    type: 'error';
    text: string;
}

export type WebviewMessage = SearchHeroiCommitsMessage;
export type ExtensionMessage = CommitsDataMessage | ErrorMessage;
