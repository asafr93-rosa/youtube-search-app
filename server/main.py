"""
Whisper transcription server using Groq API.
Uses yt-dlp + bgutil PO token plugin to download YouTube audio (bypasses bot detection),
then Groq's hosted Whisper to transcribe.

Usage:
    cd server
    python -m venv venv && source venv/bin/activate
    pip install -r requirements.txt
    GROQ_API_KEY=your_key python main.py
"""

import os
import base64
import json
import tempfile
import subprocess
import sys
import urllib.request
from pathlib import Path

from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from groq import Groq
import uvicorn

app = FastAPI(title="Whisper Transcription Server")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:4173", "https://youtube-search-app-kappa.vercel.app"],
    allow_methods=["GET"],
    allow_headers=["*"],
)

GROQ_API_KEY = os.getenv("GROQ_API_KEY")
YOUTUBE_COOKIES_B64 = os.getenv("YOUTUBE_COOKIES_B64")

# Decode cookies at startup if provided
COOKIES_PATH = None
if YOUTUBE_COOKIES_B64:
    try:
        _f = tempfile.NamedTemporaryFile(delete=False, suffix=".txt", mode="wb")
        _f.write(base64.b64decode(YOUTUBE_COOKIES_B64))
        _f.close()
        COOKIES_PATH = _f.name
        print(f"YouTube cookies loaded → {COOKIES_PATH}")
    except Exception as e:
        print(f"WARNING: Failed to decode YOUTUBE_COOKIES_B64: {e}")

PIPED_INSTANCES = [
    "https://pipedapi.kavin.rocks",
    "https://piped-api.garudalinux.org",
    "https://api.piped.yt",
    "https://watchapi.whatever.social",
]


def try_ytdlp(video_id: str, tmpdir: str) -> str:
    """Download audio using yt-dlp with web client + bgutil PO token plugin."""
    url = f"https://www.youtube.com/watch?v={video_id}"
    output_template = os.path.join(tmpdir, "audio.%(ext)s")
    cmd = [
        sys.executable, "-m", "yt_dlp",
        "--no-playlist",
        "--format", "bestaudio/best",
        "--extractor-args", "youtube:player_client=web",
        "--output", output_template,
        "--no-progress",
        "--no-warnings",
        url,
    ]
    if COOKIES_PATH:
        cmd += ["--cookies", COOKIES_PATH]

    result = subprocess.run(cmd, capture_output=True, text=True, timeout=90)
    if result.returncode != 0:
        raise RuntimeError(result.stderr.strip() or result.stdout.strip() or "unknown error")

    files = list(Path(tmpdir).glob("audio.*"))
    if not files:
        raise RuntimeError("no file created")
    return str(files[0])


def try_piped(video_id: str, tmpdir: str) -> str:
    """Fallback: download audio via Piped API instances."""
    headers = {"User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36"}

    for instance in PIPED_INSTANCES:
        try:
            req = urllib.request.Request(f"{instance}/streams/{video_id}", headers=headers)
            with urllib.request.urlopen(req, timeout=10) as resp:
                data = json.loads(resp.read())

            audio_streams = data.get("audioStreams", [])
            if not audio_streams:
                continue

            audio_streams.sort(key=lambda x: x.get("bitrate", 999999))
            audio_url = audio_streams[0]["url"]

            output_path = os.path.join(tmpdir, "audio.m4a")
            dl_req = urllib.request.Request(audio_url, headers={
                **headers,
                "Referer": "https://www.youtube.com/",
                "Origin": "https://www.youtube.com",
            })
            with urllib.request.urlopen(dl_req, timeout=60) as resp2:
                data_bytes = resp2.read()

            if len(data_bytes) > 1000:
                with open(output_path, "wb") as f:
                    f.write(data_bytes)
                print(f"Piped download succeeded via {instance}")
                return output_path

        except Exception as e:
            print(f"Piped {instance} failed: {e}")
            continue

    raise RuntimeError("All Piped instances failed")


def download_audio(video_id: str, tmpdir: str) -> str:
    """Download audio: try yt-dlp+bgutil first, then Piped fallback."""
    try:
        path = try_ytdlp(video_id, tmpdir)
        print(f"yt-dlp succeeded for {video_id}")
        return path
    except Exception as e:
        print(f"yt-dlp failed: {str(e)[:200]}")

    try:
        return try_piped(video_id, tmpdir)
    except Exception as e:
        print(f"Piped failed: {str(e)[:200]}")

    raise RuntimeError("All download strategies failed — yt-dlp (bgutil) and Piped both unavailable")


@app.get("/transcribe")
async def transcribe(v: str = Query(..., min_length=11, max_length=11)):
    if not GROQ_API_KEY:
        raise HTTPException(status_code=503, detail="GROQ_API_KEY not configured")

    with tempfile.TemporaryDirectory() as tmpdir:
        try:
            audio_path = download_audio(v, tmpdir)
        except RuntimeError as e:
            raise HTTPException(status_code=502, detail=str(e))
        except subprocess.TimeoutExpired:
            raise HTTPException(status_code=504, detail="Audio download timed out")

        try:
            client = Groq(api_key=GROQ_API_KEY)
            with open(audio_path, "rb") as audio_file:
                transcription = client.audio.transcriptions.create(
                    file=(os.path.basename(audio_path), audio_file.read()),
                    model="whisper-large-v3-turbo",
                )
            transcript = transcription.text
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Groq Whisper error: {str(e)}")

    return {"transcript": transcript}


@app.get("/health")
async def health():
    return {"status": "ok", "model": "whisper-large-v3-turbo (Groq)", "cookies": bool(COOKIES_PATH)}


if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=int(os.getenv("PORT", "8000")))
