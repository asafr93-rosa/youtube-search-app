"""
Whisper transcription server using Groq API.
Uses yt-dlp to download YouTube audio, then Groq's Whisper API to transcribe.

Usage:
    cd server
    python -m venv venv && source venv/bin/activate
    pip install -r requirements.txt
    GROQ_API_KEY=your_key python main.py
"""

import os
import tempfile
import subprocess
import sys
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


def download_audio(video_id: str, tmpdir: str) -> str:
    """Download YouTube audio using yt-dlp. Returns path to downloaded file."""
    url = f"https://www.youtube.com/watch?v={video_id}"
    output_template = os.path.join(tmpdir, "audio.%(ext)s")
    cmd = [
        sys.executable, "-m", "yt_dlp",
        "--no-playlist",
        "--format", "worstaudio",
        "--extractor-args", "youtube:player_client=android",
        "--output", output_template,
        "--no-progress",
        url,
    ]
    result = subprocess.run(cmd, capture_output=True, text=True, timeout=120)
    print(f"yt-dlp stdout: {result.stdout}")
    print(f"yt-dlp stderr: {result.stderr}")
    print(f"yt-dlp returncode: {result.returncode}")
    if result.returncode != 0:
        raise RuntimeError(f"yt-dlp failed: {result.stderr.strip() or result.stdout.strip()}")
    # Find the downloaded file (extension varies: m4a, webm, etc.)
    files = list(Path(tmpdir).glob("audio.*"))
    print(f"Downloaded files: {files}")
    if not files:
        raise RuntimeError("yt-dlp ran but no audio file was created")
    return str(files[0])


@app.get("/transcribe")
async def transcribe(v: str = Query(..., min_length=11, max_length=11)):
    """Transcribe a YouTube video by video ID."""
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
    return {"status": "ok", "model": "whisper-large-v3-turbo (Groq)"}


if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=int(os.getenv("PORT", "8000")))
