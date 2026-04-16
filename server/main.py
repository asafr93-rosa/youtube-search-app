"""
Local Whisper transcription server.
Uses yt-dlp to download YouTube audio, then faster-whisper to transcribe.

Usage:
    cd server
    python -m venv venv && source venv/bin/activate
    pip install -r requirements.txt
    python main.py
"""

import os
import tempfile
import subprocess
import sys
from pathlib import Path

from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from faster_whisper import WhisperModel
import uvicorn

app = FastAPI(title="Whisper Transcription Server")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:4173", "https://youtube-search-app-kappa.vercel.app"],
    allow_methods=["GET"],
    allow_headers=["*"],
)

# Load model once at startup (tiny = fast, base = more accurate)
MODEL_SIZE = os.getenv("WHISPER_MODEL", "base")
print(f"Loading Whisper model '{MODEL_SIZE}'... (first run downloads it)")
model = WhisperModel(MODEL_SIZE, device="cpu", compute_type="int8")
print(f"Model '{MODEL_SIZE}' ready.")


def download_audio(video_id: str, output_path: str) -> None:
    """Download YouTube audio to output_path using yt-dlp."""
    url = f"https://www.youtube.com/watch?v={video_id}"
    cmd = [
        sys.executable, "-m", "yt_dlp",
        "--no-playlist",
        "--extract-audio",
        "--audio-format", "mp3",
        "--audio-quality", "9",
        "--output", output_path,
        "--no-progress",
        "--quiet",
        url,
    ]
    result = subprocess.run(cmd, capture_output=True, text=True, timeout=120)
    if result.returncode != 0:
        raise RuntimeError(f"yt-dlp failed: {result.stderr.strip()}")


@app.get("/transcribe")
async def transcribe(v: str = Query(..., min_length=11, max_length=11)):
    """Transcribe a YouTube video by video ID."""
    with tempfile.TemporaryDirectory() as tmpdir:
        audio_path = os.path.join(tmpdir, "audio.mp3")

        try:
            download_audio(v, audio_path)
        except RuntimeError as e:
            raise HTTPException(status_code=502, detail=str(e))
        except subprocess.TimeoutExpired:
            raise HTTPException(status_code=504, detail="Audio download timed out")

        if not Path(audio_path).exists():
            raise HTTPException(status_code=502, detail="Audio file not created by yt-dlp")

        try:
            segments, _ = model.transcribe(audio_path, beam_size=5)
            transcript = " ".join(segment.text.strip() for segment in segments)
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Whisper error: {str(e)}")

    return {"transcript": transcript}


@app.get("/health")
async def health():
    return {"status": "ok", "model": MODEL_SIZE}


if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=int(os.getenv("PORT", "8000")))
