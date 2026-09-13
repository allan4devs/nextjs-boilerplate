"""Create browser-compatible sidecars without changing originals. Requires imageio-ffmpeg or FFMPEG_BINARY."""
import os
from pathlib import Path
import subprocess
from concurrent.futures import ThreadPoolExecutor

ffmpeg = os.environ.get("FFMPEG_BINARY")
if not ffmpeg:
    import imageio_ffmpeg
    ffmpeg = imageio_ffmpeg.get_ffmpeg_exe()

def convert(source):
    target = source.with_name(source.name + ".browser.mp4")
    if target.exists() and target.stat().st_mtime >= source.stat().st_mtime:
        return
    temporary = target.with_suffix(".partial.mp4")
    subprocess.run([ffmpeg, "-hide_banner", "-loglevel", "error", "-y", "-i", str(source),
        "-map", "0:v:0", "-map", "0:a:0?", "-vf", "scale=720:720:force_original_aspect_ratio=decrease:force_divisible_by=2,format=yuv420p",
        "-r", "30", "-c:v", "libx264", "-preset", "veryfast", "-crf", "24", "-threads", "2",
        "-c:a", "aac", "-b:a", "128k", "-movflags", "+faststart", str(temporary)], check=True)
    temporary.replace(target)
    print(f"Listo: {source.name}", flush=True)

sources = [p for p in Path("public").rglob("*") if p.is_file() and p.suffix.lower() in {".mov", ".m4v"}]
with ThreadPoolExecutor(max_workers=2) as pool:
    list(pool.map(convert, sources))
print(f"Preparados {len(sources)} videos.", flush=True)
