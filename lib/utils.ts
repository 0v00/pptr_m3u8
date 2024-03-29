import fs from 'fs';
import { AGM } from '../types';

export function getChunklistUrlSubstring(url: string): string {
    const pattern: RegExp = /^(.*chunklist\.m3u8)/;
    const match: RegExpMatchArray | null = url.match(pattern);
    return match ? match[1] : "no match found";
};

export function writeChunklistUrl(url: string): void {
    const stream: fs.WriteStream = fs.createWriteStream("chunklist.txt", { flags: "a+" });
    stream.write(`${url}\n`);
    stream.end();
};

export function chunkArray<T>(array: T[], chunkSize: number): T[][] {
    const chunks: T[][] = [];
    for (let i = 0; i < array.length; i += chunkSize) {
        chunks.push(array.slice(i, i + chunkSize));
    }
    return chunks;
};

export async function processBatch(batch: AGM[], action: (agm: AGM) => Promise<void>): Promise<void> {
    const promises: Promise<void>[] = batch.map((agm) => action(agm));
    const results: PromiseSettledResult<void>[] = await Promise.allSettled(promises);
    results.forEach((result, index) => {
        if (result.status === "fulfilled") {
            console.log(`${batch[index].name} ${batch[index].year} completed successfully`);
        } else {
            console.log(`${batch[index].name} ${batch[index].year} failed: ${result.reason}`);
        }
    })
};