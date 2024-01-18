#!/bin/bash

echo "Running playlist.ts to download files..."
npm install
tsc
if [ $? -ne 0 ]; then
    echo "TypeScript compilation failed"
    exit 1
fi
node dist/playlist.js

if [ ! -d "audio" ] || [ -z "$(ls -A audio)" ]; then
   echo "No audio files found. Exiting script."
   exit 1
fi

cd audio
for oldfile in *; do

    newfile="${oldfile%.*}.wav"

    ffmpeg -i "$oldfile" -t 60 -ar 16000 -ac 1 -c:a pcm_s16le "$newfile" && rm "$oldfile"

    echo "Processing $newfile with whisper.cpp"
    # use correct path to whisper.cpp dir
    ./main -m /models/ggml-large-v2.bin -oj -f "$newfile"

    if [ $? -eq 0 ]; then
        echo "Successfully processed $newfile with whisper.cpp"
    else
        echo "Failed to process $newfile with whisper.cpp"
    fi

done
