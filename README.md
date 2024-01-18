Not all companies provide complete transcribed text of their annual general meetings. Use Puppeteer to scrape m3u8 playlists from annual general meeting webcasts, and then download the audio with yt-dlp. Lastly, transcribe the audio using [whisper.cpp](https://github.com/ggerganov/whisper.cpp).

Tested against the most commonly used webcast/streaming service providers used by larger companies in Australia.

## prerequisites
Install `yt-dlp`, `ffmpeg`, and [whisper.cpp](https://github.com/ggerganov/whisper.cpp).

## how to use
Place the annual general meetings you want to download and transcribe in `urls.csv`.

1. `npm install`
2. `npm start` to run the scraping/audio download process
3. alternatively, run `./process_playlist_audio.sh` to scrape, download the audio, and transcribe with whisper.cpp.

Playlist scraping and audio downloads can both be configured to run in batches of `N` size - currently we run batches of `2` for both, but this can be changed by updating the second param in `chunkArray`:
```ts
    const agmBatches: AGM[][] = chunkArray(agms, 2);
    for (const agmBatch of agmBatches) {
        await processBatch(agmBatch, getM3U8Playlist);
    }

    const chunklistAGMs: AGM[] = Array.from(chunklistSet);
    const urlBatches: AGM[][] = chunkArray(chunklistAGMs, 2);
    for (const urlBatch of urlBatches) {
        await processBatch(urlBatch, downloadPlaylistAudio);
    }
```

Downloaded audio files will be output to an `audio` dir. Transcribed audio files will also be output to the same `audio` dir.

## to do
- use whisper with mlx
- llm to search/summarize whisper output?
- performance bottlenecks: some of the AGMs can take awhile to download. whisper can also take time to transcribe. speed up if/where possible.