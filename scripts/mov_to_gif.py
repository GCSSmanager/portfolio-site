#!/usr/bin/env python3
"""Convert screen recordings (mov/mp4) to compact web GIFs for demo tips.

Examples:
  python3 scripts/mov_to_gif.py "/Users/me/Desktop/clip.mov"
  python3 scripts/mov_to_gif.py clip.mov -o demos/clinic-crm/public/tips/directories.gif
  python3 scripts/mov_to_gif.py clip.mov --width 720 --fps 12 --max-seconds 12
"""

from __future__ import annotations

import argparse
import shutil
import subprocess
import sys
import tempfile
from pathlib import Path


def require_ffmpeg() -> str:
    path = shutil.which("ffmpeg")
    if not path:
        raise SystemExit("ffmpeg не найден. Установите: brew install ffmpeg")
    return path


def run(cmd: list[str]) -> None:
    print("+", " ".join(cmd))
    subprocess.run(cmd, check=True)


def convert(
    src: Path,
    dest: Path,
    *,
    width: int,
    fps: int,
    max_seconds: float | None,
    start: float,
) -> None:
    ffmpeg = require_ffmpeg()
    dest.parent.mkdir(parents=True, exist_ok=True)

    vf_scale = f"fps={fps},scale={width}:-1:flags=lanczos"
    time_args: list[str] = []
    if start > 0:
        time_args += ["-ss", str(start)]
    if max_seconds is not None and max_seconds > 0:
        time_args += ["-t", str(max_seconds)]

    with tempfile.TemporaryDirectory(prefix="mov2gif-") as tmp:
        palette = Path(tmp) / "palette.png"
        # Two-pass palette for cleaner GIF
        run(
            [
                ffmpeg,
                "-y",
                *time_args,
                "-i",
                str(src),
                "-vf",
                f"{vf_scale},palettegen=stats_mode=diff",
                "-frames:v",
                "1",
                "-update",
                "1",
                str(palette),
            ]
        )
        run(
            [
                ffmpeg,
                "-y",
                *time_args,
                "-i",
                str(src),
                "-i",
                str(palette),
                "-lavfi",
                f"{vf_scale}[x];[x][1:v]paletteuse=dither=bayer:bayer_scale=3:diff_mode=rectangle",
                "-loop",
                "0",
                str(dest),
            ]
        )

    size_kb = dest.stat().st_size / 1024
    print(f"OK → {dest} ({size_kb:.0f} KB)")


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description="MOV/MP4 → GIF для демо-подсказок")
    parser.add_argument("input", type=Path, help="Исходный .mov / .mp4")
    parser.add_argument(
        "-o",
        "--output",
        type=Path,
        help="Куда сохранить .gif (по умолчанию рядом с исходником)",
    )
    parser.add_argument("--width", type=int, default=720, help="Ширина gif (по умолчанию 720)")
    parser.add_argument("--fps", type=int, default=12, help="Кадров в секунду (по умолчанию 12)")
    parser.add_argument(
        "--max-seconds",
        type=float,
        default=12.0,
        help="Обрезать длиннее N секунд (0 = без обрезки)",
    )
    parser.add_argument("--start", type=float, default=0.0, help="Старт обрезки в секундах")
    args = parser.parse_args(argv)

    src = args.input.expanduser().resolve()
    if not src.exists():
        raise SystemExit(f"Файл не найден: {src}")

    dest = args.output
    if dest is None:
        dest = src.with_suffix(".gif")
    else:
        dest = dest.expanduser().resolve()

    max_seconds = None if args.max_seconds <= 0 else args.max_seconds
    convert(
        src,
        dest,
        width=args.width,
        fps=args.fps,
        max_seconds=max_seconds,
        start=args.start,
    )
    return 0


if __name__ == "__main__":
    sys.exit(main())
