import fs from 'fs';
import readline from 'node:readline';
import { spawn } from 'child_process';
import puppeteer, { HTTPRequest } from 'puppeteer';
import { Browser, Page } from 'puppeteer';
import { AGM } from './types';
import { getChunklistUrlSubstring, chunkArray, processBatch } from './lib/utils';

const chunklistSet: Set<AGM> = new Set();

async function downloadPlaylistAudio(agm: AGM): Promise<void> {
    return new Promise((resolve, reject) => {
        fs.mkdir("audio", { recursive: true }, (error) => {
            if (error) {
                console.log(`error in creating dir: ${error}`);
            } else {
                console.log("path created or already exists");
            }
        });
        const outputPath = `audio/${agm.name}_${agm.year}.%(ext)s`;

        const process = spawn("yt-dlp", ["-x", "-o", outputPath, agm.url]);
        process.stdout.on("data", (data) => {
            console.log(`[${agm.name} ${agm.year}]`);
        });
        process.stderr.on("data", (data) => {
            console.log(`[${agm.name} ${agm.year}] stderr: ${data}`);
        });
        process.on("close", (code) => {
            if (code === 0) {
                resolve();
            } else {
                reject(new Error(`error: yt-dlp exited with code ${code}`));
            }
        });
    })
};

async function getM3U8Playlist(agm: AGM): Promise<void> {
    const urlPatterns: {[key: string]: string} = {
        "https://webcast.openbriefing.com": "chunklist.m3u8"
    };
    const targetString: string | undefined = Object.keys(urlPatterns).find((key) => agm.url.includes(key));
    const m3u8Playlist: string = targetString ? urlPatterns[targetString] : ".m3u8";

    const browser: Browser = await puppeteer.launch({ headless: false });
    const page: Page = await browser.newPage();

    let timeoutHandle: NodeJS.Timeout;
    const requestInterceptor = new Promise<void>((resolve, reject) => {
        page.on("request", async (interceptedRequest: HTTPRequest) => {
            if (interceptedRequest.url().includes(m3u8Playlist)) {
                const interceptedUrl = interceptedRequest.url();
                const chunklistUrl: string = m3u8Playlist === "chunklist.m3u8" ? getChunklistUrlSubstring(interceptedUrl) : interceptedUrl;
                const chunklistAGM = { name: agm.name, year: agm.year, url: chunklistUrl };
                if (!Array.from(chunklistSet).some((agm) => agm.url === chunklistUrl)) {
                    chunklistSet.add(chunklistAGM);
                }
                clearTimeout(timeoutHandle);
                resolve();
            } else {
                interceptedRequest.continue();
            }
        });

        timeoutHandle = setTimeout(() => {
            console.log(`Timeout reached for ${agm.url}`);
            reject(new Error(`Timeout reached for ${agm.url}`));
        }, 15000);
    });

    await page.setRequestInterception(true);
    await page.goto(agm.url, { waitUntil: "load", timeout: 30000 });

    // try-catch-finally blocks are ugly
    try {
        await requestInterceptor;
    } catch (error) {
        console.log(error)
    } finally {
        clearTimeout(15000);
        await page.close();
        await browser.close();
    }
}

async function main(): Promise<void> {
    const fileStream: fs.ReadStream = fs.createReadStream("urls.csv");
    const rl: readline.Interface = readline.createInterface({
        input: fileStream,
        crlfDelay: Infinity,
    });

    const agms: AGM[] = [];
    for await (const line of rl) {
        const [name, year, url] = line.split(",");
        if (name !== "name") {
            agms.push({ name, year, url: url.trim() });
        }
    }

    const agmBatches: AGM[][] = chunkArray(agms, 2);
    for (const agmBatch of agmBatches) {
        await processBatch(agmBatch, getM3U8Playlist);
    }

    const chunklistAGMs: AGM[] = Array.from(chunklistSet);
    const urlBatches: AGM[][] = chunkArray(chunklistAGMs, 2);
    for (const urlBatch of urlBatches) {
        await processBatch(urlBatch, downloadPlaylistAudio);
    }
}

main();