#!/usr/bin/env python3
"""Generate KoalaCookies browser extension icons.
Creates minimal but recognizable koala-themed PNG icons.
Requires only Python 3 standard library."""

import struct
import zlib
import math

def create_png(width, height, pixels):
    """Create a PNG from raw RGBA pixel data. pixels is list of (r,g,b,a) tuples."""
    def chunk(ctype, data):
        c = ctype + data
        crc = struct.pack('>I', zlib.crc32(c) & 0xffffffff)
        return struct.pack('>I', len(data)) + c + crc

    header = b'\x89PNG\r\n\x1a\n'
    ihdr = chunk(b'IHDR', struct.pack('>IIBBBBB', width, height, 8, 6, 0, 0, 0))

    raw = b''
    for y in range(height):
        raw += b'\x00'
        for x in range(width):
            r, g, b, a = pixels[y * width + x]
            raw += bytes([r, g, b, a])

    idat = chunk(b'IDAT', zlib.compress(raw))
    iend = chunk(b'IEND', b'')
    return header + ihdr + idat + iend

def lerp(a, b, t):
    return a + (b - a) * t

def draw_circle(cx, cy, r, pixels, w, h, color):
    for y in range(h):
        for x in range(w):
            dx, dy = x - cx, y - cy
            dist = math.sqrt(dx*dx + dy*dy)
            if dist <= r:
                alpha = 255 if dist < r - 1 else int(255 * (r - dist))
                alpha = max(0, min(255, alpha))
                if alpha > 0:
                    idx = y * w + x
                    ex = pixels[idx]
                    nr = int(lerp(ex[0], color[0], alpha/255))
                    ng = int(lerp(ex[1], color[1], alpha/255))
                    nb = int(lerp(ex[2], color[2], alpha/255))
                    na = max(ex[3], alpha)
                    pixels[idx] = (nr, ng, nb, na)

def draw_ellipse(cx, cy, rx, ry, pixels, w, h, color):
    for y in range(h):
        for x in range(w):
            dx, dy = (x - cx) / rx, (y - cy) / ry
            dist = math.sqrt(dx*dx + dy*dy)
            if dist <= 1.0:
                alpha = 255 if dist < 0.92 else int(255 * (1.0 - dist) * 12.5)
                alpha = max(0, min(255, alpha))
                if alpha > 0:
                    idx = y * w + x
                    ex = pixels[idx]
                    nr = int(lerp(ex[0], color[0], alpha/255))
                    ng = int(lerp(ex[1], color[1], alpha/255))
                    nb = int(lerp(ex[2], color[2], alpha/255))
                    na = max(ex[3], alpha)
                    pixels[idx] = (nr, ng, nb, na)

def generate_icon(size):
    w, h = size, size
    pixels = [(0, 0, 0, 0)] * (w * h)
    cx, cy = w/2, h/2

    bg_color = (46, 125, 50)
    ear_color = (120, 120, 120)
    ear_inner = (200, 200, 200)
    face_color = (155, 155, 155)
    eye_color = (30, 30, 30)
    nose_color = (50, 50, 50)
    mouth_color = (60, 60, 60)
    white = (255, 255, 255)

    bg_r = size * 0.46
    draw_circle(cx, cy, bg_r, pixels, w, h, bg_color)

    head_r = size * 0.24

    ear_size = size * 0.11
    ear_offset_x = size * 0.17
    ear_offset_y = size * 0.16

    draw_circle(cx - ear_offset_x, cy - ear_offset_y, ear_size, pixels, w, h, ear_color)
    draw_circle(cx + ear_offset_x, cy - ear_offset_y, ear_size, pixels, w, h, ear_color)
    draw_circle(cx - ear_offset_x, cy - ear_offset_y, ear_size * 0.55, pixels, w, h, ear_inner)
    draw_circle(cx + ear_offset_x, cy - ear_offset_y, ear_size * 0.55, pixels, w, h, ear_inner)

    draw_ellipse(cx, cy + size * 0.02, head_r * 1.15, head_r * 1.1, pixels, w, h, face_color)

    eye_r = size * 0.04
    eye_y = cy - size * 0.02
    eye_x_off = size * 0.06

    draw_circle(cx - eye_x_off, eye_y, eye_r, pixels, w, h, eye_color)
    draw_circle(cx + eye_x_off, eye_y, eye_r, pixels, w, h, eye_color)

    if size >= 48:
        highlight_r = eye_r * 0.35
        draw_circle(cx - eye_x_off - eye_r*0.2, eye_y - eye_r*0.3, highlight_r, pixels, w, h, white)
        draw_circle(cx + eye_x_off - eye_r*0.2, eye_y - eye_r*0.3, highlight_r, pixels, w, h, white)

    nose_w, nose_h = size * 0.07, size * 0.05
    nose_y = cy + size * 0.06
    draw_ellipse(cx, nose_y, nose_w, nose_h, pixels, w, h, nose_color)

    if size >= 32:
        mouth_w, mouth_h = size * 0.03, size * 0.02
        mouth_off = size * 0.04
        mouth_y = cy + size * 0.11
        draw_circle(cx - mouth_off, mouth_y, size * 0.015, pixels, w, h, mouth_color)
        draw_circle(cx + mouth_off, mouth_y, size * 0.015, pixels, w, h, mouth_color)

        cheek_size = size * 0.025
        cheek_x = size * 0.1
        cheek_y = cy + size * 0.04
        cheek_color = (220, 140, 140, 100)
        draw_circle(cx - cheek_x, cheek_y, cheek_size, pixels, w, h, cheek_color)
        draw_circle(cx + cheek_x, cheek_y, cheek_size, pixels, w, h, cheek_color)

    return create_png(w, h, pixels)

if __name__ == '__main__':
    import sys, os
    out_dir = sys.argv[1] if len(sys.argv) > 1 else '../extension/icons'
    os.makedirs(out_dir, exist_ok=True)

    for size in [16, 32, 48, 128]:
        path = os.path.join(out_dir, f'icon{size}.png')
        data = generate_icon(size)
        with open(path, 'wb') as f:
            f.write(data)
        print(f'  Generated {path} ({len(data)} bytes)')

    print('Icons generated successfully.')
