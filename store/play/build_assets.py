"""Build Google Play Console listing assets at exact required sizes."""

from __future__ import annotations

import math
from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parents[2]
OUT = Path(__file__).resolve().parent
SRC = OUT / "sources"
MARK = ROOT / "mobile" / "assets" / "images" / "pulse_track_mark.png"
CURSOR_ASSETS = Path.home() / ".cursor" / "projects" / "d-Projects-pulse-track" / "assets"


def to_rgb_opaque(im: Image.Image, bg: tuple[int, int, int] = (6, 11, 20)) -> Image.Image:
    if im.mode == "RGBA":
        base = Image.new("RGB", im.size, bg)
        base.paste(im, mask=im.split()[-1])
        return base
    return im.convert("RGB")


def cover_resize(im: Image.Image, size: tuple[int, int]) -> Image.Image:
    tw, th = size
    w, h = im.size
    scale = max(tw / w, th / h)
    nw, nh = max(1, int(round(w * scale))), max(1, int(round(h * scale)))
    im = im.resize((nw, nh), Image.Resampling.LANCZOS)
    left = (nw - tw) // 2
    top = (nh - th) // 2
    return im.crop((left, top, left + tw, top + th))


def ensure_sources() -> None:
    SRC.mkdir(parents=True, exist_ok=True)
    names = [
        "feature-graphic-source.png",
        "screenshot-board-source.png",
        "screenshot-activities-source.png",
        "screenshot-goals-source.png",
        "screenshot-analytics-source.png",
    ]
    for name in names:
        dest = SRC / name
        if dest.exists():
            continue
        alt = CURSOR_ASSETS / name
        if alt.exists():
            dest.write_bytes(alt.read_bytes())


def build_icon() -> Path:
    mark = Image.open(MARK).convert("RGBA")
    fill = mark.getpixel((512, 200))[:3]
    icon = Image.new("RGBA", (1024, 1024), (*fill, 255))
    px = mark.load()
    out_px = icon.load()
    for y in range(1024):
        for x in range(1024):
            r, g, b, _a = px[x, y]
            dx, dy = x - 511.5, y - 511.5
            dist = math.hypot(dx, dy)
            is_gray = abs(r - g) < 12 and abs(g - b) < 12 and r > 220
            if dist > 490 or is_gray:
                out_px[x, y] = (*fill, 255)
            else:
                out_px[x, y] = (r, g, b, 255)

    icon_512 = icon.resize((512, 512), Image.Resampling.LANCZOS)
    path = OUT / "app-icon-512.png"
    icon_512.save(path, format="PNG", optimize=True)
    return path


def build_feature_graphic() -> None:
    fg = to_rgb_opaque(Image.open(SRC / "feature-graphic-source.png"))
    fg = cover_resize(fg, (1024, 500)).convert("RGB")
    fg.save(OUT / "feature-graphic-1024x500.png", format="PNG", optimize=True)
    fg.save(OUT / "feature-graphic-1024x500.jpg", format="JPEG", quality=92, optimize=True)


def build_screenshots() -> None:
    shots = [
        ("screenshot-board-source.png", "phone-01-board-1080x1920.png"),
        ("screenshot-activities-source.png", "phone-02-activities-1080x1920.png"),
        ("screenshot-goals-source.png", "phone-03-goals-1080x1920.png"),
        ("screenshot-analytics-source.png", "phone-04-analytics-1080x1920.png"),
    ]
    for src_name, out_name in shots:
        im = to_rgb_opaque(Image.open(SRC / src_name))
        im = cover_resize(im, (1080, 1920)).convert("RGB")
        im.save(OUT / out_name, format="PNG", optimize=True)


def main() -> None:
    ensure_sources()
    build_icon()
    build_feature_graphic()
    build_screenshots()
    print("=== Play assets ===")
    for p in sorted(OUT.iterdir()):
        if not p.is_file() or p.suffix.lower() not in {".png", ".jpg", ".jpeg"}:
            continue
        if p.name.endswith("-source.png"):
            continue
        im = Image.open(p)
        kb = p.stat().st_size / 1024
        print(f"{p.name:42s} {im.size[0]}x{im.size[1]} {im.mode:4s} {kb:7.1f} KB")


if __name__ == "__main__":
    main()
