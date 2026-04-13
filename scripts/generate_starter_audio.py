from __future__ import annotations

import os
import subprocess
import sys
import time
from pathlib import Path

SAMPLES = [
    ("starter-welcome-flow", "あ い う え お"),
    ("starter-vowel-rhythm", "あ い う え お"),
    ("starter-hiragana-a-row", "あ い う え お"),
    ("starter-hiragana-ka-sa", "さ し す せ そ"),
    ("starter-hiragana-ta-na", "な に ぬ ね の"),
    ("starter-hiragana-ha-ma", "ま み む め も"),
    ("starter-hiragana-ya-ra-wa", "や ゆ よ ら り る れ ろ"),
    ("starter-hiragana-voiced-small", "が ざ だ ば ぱ きゃ しゅ ちょ"),
    ("starter-hiragana-words-1", "さかな ねこ たまご"),
    ("starter-hiragana-words-2", "みず くるま はこ"),
    ("starter-greetings-1", "こんにちは"),
    ("starter-greetings-2", "わたしは コルトン です"),
    ("starter-self-intro-2", "よろしく おねがいします"),
    ("starter-numbers-basic", "いち に さん よん ご"),
    ("starter-days-basic", "げつようび まいにち"),
]

VOICE = "ja-JP-NanamiNeural"
ROOT = Path(__file__).resolve().parents[1]
OUT_DIR = ROOT / "public" / "audio" / "starter"


def generate_file(lesson_id: str, text: str) -> None:
    target = OUT_DIR / f"{lesson_id}.mp3"
    env = os.environ.copy()
    env["PYTHONIOENCODING"] = "utf-8"

    command = [
        sys.executable,
        "-m",
        "edge_tts",
        "--voice",
        VOICE,
        "--text",
        text,
        "--write-media",
        str(target),
    ]

    last_error = None
    for attempt in range(3):
        completed = subprocess.run(command, env=env, capture_output=True, text=True, encoding="utf-8")
        if completed.returncode == 0 and target.exists():
            print(target.name)
            return

        last_error = completed.stderr.strip() or completed.stdout.strip() or "unknown edge-tts failure"
        time.sleep(1 + attempt)

    raise RuntimeError(f"Failed to generate {lesson_id}: {last_error}")


def main() -> None:
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    for lesson_id, text in SAMPLES:
        generate_file(lesson_id, text)


if __name__ == "__main__":
    main()
