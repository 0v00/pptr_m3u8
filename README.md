Not all companies provide complete transcribed text of their annual general meetings. Use Puppeteer to scrape m3u8 playlists from annual general meeting webcasts, and then download the audio with yt-dlp. Lastly, transcribe the audio using [whisper.cpp](https://github.com/ggerganov/whisper.cpp).

Tested against the most commonly used webcast/streaming service providers used by larger companies in Australia.

## how to use
Place the annual general meetings you want to download and transcribe in `urls.csv`.

1. `npm install`
2. `npm start` to run the scraping/audio download process
3. alternatively, run `./process_playlist_audio.sh` to scrape, download the audio, and transcribe with whisper.cpp (follow the [whisper.cpp](https://github.com/ggerganov/whisper.cpp) installation instructions on how to set this up)

## to do (maybe)
- use whisper with mlx
- llm to search/summarize whisper output?