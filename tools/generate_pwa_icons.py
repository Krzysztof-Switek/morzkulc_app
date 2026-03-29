"""
Generate PWA icons for SKK Morzkulc app.
Uses only Python stdlib (struct + zlib) — no external dependencies.

Design: dark navy background (#0b0f17), light-blue "M" letter (#8ab4ff),
        subtle rounded-rect inner card (#111d35).
"""
import struct
import zlib
import os
import math

# ── Colors (R, G, B) ─────────────────────────────────────────────────────────
BG    = (11,  15,  23)    # #0b0f17  — app dark background
CARD  = (17,  29,  53)    # #111d35  — slightly lighter inner card
M_CLR = (138, 180, 255)   # #8ab4ff  — app primary blue → "M" fill

# ── PNG writer ────────────────────────────────────────────────────────────────
def _chunk(tag: bytes, data: bytes) -> bytes:
    crc = zlib.crc32(tag + data) & 0xFFFFFFFF
    return struct.pack(">I", len(data)) + tag + data + struct.pack(">I", crc)


def write_png(filepath: str, size: int, pixels: list[tuple[int, int, int]]) -> None:
    ihdr = struct.pack(">IIBBBBB", size, size, 8, 2, 0, 0, 0)
    raw = bytearray()
    for y in range(size):
        raw.append(0)                       # filter: None
        for x in range(size):
            r, g, b = pixels[y * size + x]
            raw.extend((r, g, b))
    os.makedirs(os.path.dirname(filepath), exist_ok=True)
    with open(filepath, "wb") as f:
        f.write(
            b"\x89PNG\r\n\x1a\n"
            + _chunk(b"IHDR", ihdr)
            + _chunk(b"IDAT", zlib.compress(bytes(raw), 6))
            + _chunk(b"IEND", b"")
        )

# ── Drawing helpers ───────────────────────────────────────────────────────────
def _set(pixels: list, size: int, x: int, y: int, color: tuple) -> None:
    if 0 <= x < size and 0 <= y < size:
        pixels[y * size + x] = color


def _fill_rect(pixels, size, x0, y0, x1, y1, color):
    for y in range(max(0, y0), min(size, y1)):
        for x in range(max(0, x0), min(size, x1)):
            pixels[y * size + x] = color


def _fill_rounded_rect(pixels, size, x0, y0, x1, y1, r, color):
    """Filled rounded rectangle."""
    for y in range(y0, y1):
        for x in range(x0, x1):
            # corner-test
            cx = cy = None
            if x < x0 + r and y < y0 + r:
                cx, cy = x0 + r, y0 + r
            elif x >= x1 - r and y < y0 + r:
                cx, cy = x1 - r, y0 + r
            elif x < x0 + r and y >= y1 - r:
                cx, cy = x0 + r, y1 - r
            elif x >= x1 - r and y >= y1 - r:
                cx, cy = x1 - r, y1 - r
            if cx is not None and math.hypot(x - cx, y - cy) > r:
                continue
            _set(pixels, size, x, y, color)


def _draw_thick_line(pixels, size, x0, y0, x1, y1, thickness, color):
    """Bresenham-like thick line (anti-aliasing-free)."""
    dx, dy = x1 - x0, y1 - y0
    length = math.hypot(dx, dy)
    if length < 1:
        return
    px, py = -dy / length, dx / length      # perpendicular unit vector
    steps = int(max(abs(dx), abs(dy))) + 1
    half = thickness / 2.0
    for i in range(steps + 1):
        t = i / steps
        cx = x0 + dx * t
        cy = y0 + dy * t
        for d in range(int(-half) - 1, int(half) + 2):
            nx = int(round(cx + px * d))
            ny = int(round(cy + py * d))
            _set(pixels, size, nx, ny, color)

# ── Icon builder ─────────────────────────────────────────────────────────────
def make_icon(size: int) -> list[tuple[int, int, int]]:
    pixels = [BG] * (size * size)

    # Rounded-rect card background
    pad = max(1, int(size * 0.07))
    rad = max(2, int(size * 0.20))
    _fill_rounded_rect(pixels, size, pad, pad, size - pad, size - pad, rad, CARD)

    # ── Draw "M" ────────────────────────────────────────────────────────────
    s = int(size * 0.15)   # left start x
    e = size - s           # right end x
    t = int(size * 0.20)   # top y
    b = int(size * 0.80)   # bottom y
    sw = max(2, int(size * 0.11))   # stroke width

    mid_x = (s + e) // 2
    mid_y = (t + b) // 2

    # Left vertical bar
    _fill_rect(pixels, size, s, t, s + sw, b, M_CLR)
    # Right vertical bar
    _fill_rect(pixels, size, e - sw, t, e, b, M_CLR)
    # Left diagonal: top-left → center
    _draw_thick_line(pixels, size, s + sw // 2, t, mid_x, mid_y, sw, M_CLR)
    # Right diagonal: top-right → center
    _draw_thick_line(pixels, size, e - sw // 2, t, mid_x, mid_y, sw, M_CLR)

    return pixels

# ── Main ──────────────────────────────────────────────────────────────────────
if __name__ == "__main__":
    project_root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    icons_dir = os.path.join(project_root, "public", "icons")

    for size in [16, 32, 180, 192, 512]:
        path = os.path.join(icons_dir, f"icon-{size}.png")
        write_png(path, size, make_icon(size))
        print(f"  OK  {path}  ({size}x{size})")

    print("Done.")