import { exec } from 'child_process';
import * as util from 'util';
import { Commit } from './types';

const execPromise = util.promisify(exec);

export class GitService {

    /**
     * Get commits from git log between two dates
     * @param repoPath Path to the git repository
     * @param dateFrom Start date (YYYY-MM-DD format)
     * @param dateUntil End date (YYYY-MM-DD format)
     * @returns Array of commits with fecha, dia, hora, and author
     */
    async getCommits(repoPath: string, dateFrom: string, dateUntil: string): Promise<Commit[]> {
        const gitCommand = `git log --since="${dateFrom}" --until="${dateUntil}" --pretty=format:"%ad|%an" --date=iso`;

        const { stdout } = await execPromise(gitCommand, { cwd: repoPath });

        const lines = stdout.trim().split('\n').filter(Boolean);
        const commitList: Commit[] = [];

        for (const line of lines) {
            const [fullDate, author] = line.split('|');
            if (!fullDate || !author) continue;

            const [date, time, zone] = fullDate.split(' ');
            const [yy, mm, day] = date.split('-');

            commitList.push({
                fecha: date,
                dia: day,
                hora: this.decimalHour(time),
                author: author
            });
        }

        return commitList;
    }

    /**
     * Convert time string to decimal hour
     * @param hora Time string in HH:MM:SS format
     * @returns Decimal hour representation
     */
    private decimalHour(hora: string): number {
        const [hh, mm, ss] = hora.split(":").map(Number);
        return hh + mm / 60 + (ss ?? 0) / 3600;
    }
}
