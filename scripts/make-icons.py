"""Draws the extension's PNG icons (needed by the add-ons store listing).

Usage: python scripts/make-icons.py
Needs Pillow (pip install pillow). Writes extension/icons/icon-{48,96,128}.png.
"""
from pathlib import Path

from PIL import Image, ImageDraw

SIZE = 512  # drawn big, then scaled down for smooth edges
OUT = Path(__file__).resolve().parent.parent / "extension" / "icons"


def lerp(a, b, t):
    return tuple(round(a[i] + (b[i] - a[i]) * t) for i in range(3))


def draw_icon():
    top, bottom = (59, 130, 246), (99, 102, 241)  # blue -> indigo
    bg = Image.new("RGB", (SIZE, SIZE))
    px = ImageDraw.Draw(bg)
    for y in range(SIZE):
        px.line([(0, y), (SIZE, y)], fill=lerp(top, bottom, y / (SIZE - 1)))

    mask = Image.new("L", (SIZE, SIZE), 0)
    ImageDraw.Draw(mask).rounded_rectangle([0, 0, SIZE - 1, SIZE - 1], radius=int(SIZE * 0.22), fill=255)
    icon = Image.new("RGBA", (SIZE, SIZE), (0, 0, 0, 0))
    icon.paste(bg, mask=mask)

    d = ImageDraw.Draw(icon)
    s = SIZE
    # browser window
    d.rounded_rectangle([s * 0.16, s * 0.2, s * 0.84, s * 0.8], radius=int(s * 0.07), fill=(255, 255, 255, 255))
    # web panel (middle) and icon rail (right)
    d.rectangle([s * 0.44, s * 0.2, s * 0.66, s * 0.8], fill=(224, 231, 255, 255))
    d.rounded_rectangle([s * 0.66 - s * 0.07, s * 0.2, s * 0.84, s * 0.8], radius=int(s * 0.07), fill=(199, 210, 254, 255))
    d.rectangle([s * 0.66, s * 0.2, s * 0.72, s * 0.8], fill=(199, 210, 254, 255))
    # page lines on the left
    for i, w in enumerate((0.2, 0.15, 0.2)):
        y = s * (0.34 + i * 0.12)
        d.rounded_rectangle([s * 0.23, y, s * (0.23 + w), y + s * 0.04], radius=int(s * 0.02), fill=(203, 213, 225, 255))
    # rail dots (one active)
    cx = s * 0.75
    for i in range(3):
        cy = s * (0.34 + i * 0.14)
        r = s * 0.035
        color = (59, 130, 246, 255) if i == 0 else (99, 102, 241, 150)
        d.ellipse([cx - r, cy - r, cx + r, cy + r], fill=color)
    return icon


def main():
    OUT.mkdir(parents=True, exist_ok=True)
    base = draw_icon()
    for px in (48, 96, 128):
        base.resize((px, px), Image.LANCZOS).save(OUT / f"icon-{px}.png")
        print("wrote", OUT / f"icon-{px}.png")


if __name__ == "__main__":
    main()
