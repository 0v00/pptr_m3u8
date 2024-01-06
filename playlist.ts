import fs from 'fs';
import readline from 'node:readline';
import { spawn } from 'child_process';
import puppeteer, { HTTPRequest } from 'puppeteer';
import { Browser, Page } from 'puppeteer';
import { getChunklistUrlSubstring, writeChunklistUrl, chunkArray, processBatch } from './lib/utils';

const chunklistSet: Set<string> = new Set();

async function downloadPlaylistAudio(url: string): Promise<void> {
    return new Promise((resolve, reject) => {
        const sanitizedUrl = url.replace(/[^a-zA-Z0-9]/g, "_");
        fs.mkdir("audio", { recursive: true }, (error) => {
            if (error) {
                console.log(`error in creating dir: ${error}`);
            } else {
                console.log("path created or already exists");
            }
        });
        const outputPath = `audio/${sanitizedUrl}.%(ext)s`;
        const process = spawn("yt-dlp", ["-x", "-o", outputPath, url]);

        process.stdout.on("data", (data) => {
            console.log(`stdout: ${data}`);
        });
        process.stderr.on("data", (data) => {
            console.log(`stderr: ${data}`);
        });

        process.on("close", (code) => {
            if (code === 0) {
                resolve()
            } else {
                reject(new Error(`error: yt-dlp exited with code ${code}`));
            }
        });
    })
};

async function getM3U8Playlist(url: string): Promise<void> {
    const urlPatterns: {[key: string]: string} = {
        "https://webcast.openbriefing.com": "chunklist.m3u8"
    };
    const targetString: string | undefined = Object.keys(urlPatterns).find((key) => url.includes(key));
    const m3u8Playlist: string = targetString ? urlPatterns[targetString] : ".m3u8";

    const browser: Browser = await puppeteer.launch({ headless: false });
    const page: Page = await browser.newPage();

    let timeoutHandle: NodeJS.Timeout;
    const requestInterceptor = new Promise<void>((resolve, reject) => {
        page.on("request", async (interceptedRequest: HTTPRequest) => {
            if (interceptedRequest.url().includes(m3u8Playlist)) {
                const interceptedUrl = interceptedRequest.url();
                const chunklist: string = m3u8Playlist === "chunklist.m3u8" ? getChunklistUrlSubstring(interceptedUrl) : interceptedUrl;
                if (!chunklistSet.has(chunklist)) {
                    chunklistSet.add(chunklist);
                    writeChunklistUrl(chunklist);
                }
                clearTimeout(timeoutHandle);
                resolve();
            } else {
                interceptedRequest.continue();
            }
        });

        timeoutHandle = setTimeout(() => {
            console.log(`Timeout reached for ${url}`);
            reject(new Error(`Timeout reached for ${url}`));
        }, 15000);
    });

    await page.setRequestInterception(true);
    await page.goto(url, { waitUntil: "load", timeout: 30000 });

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
    const fileStream: fs.ReadStream = fs.createReadStream("urls.txt");
    const rl: readline.Interface = readline.createInterface({
        input: fileStream,
        crlfDelay: Infinity,
    });

    for await (const url of rl) {
        await getM3U8Playlist(url.trim());
    }

    const chunklistUrls: string[] = Array.from(chunklistSet);
    const batches: string[][] = chunkArray(chunklistUrls, 2);

    for (const batch of batches) {
        await processBatch(batch, downloadPlaylistAudio);
    }
}

main();