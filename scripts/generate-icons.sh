#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
ICONS_DIR="$SCRIPT_DIR/../extension/icons"

echo "Generating placeholder icons..."

for size in 16 32 48 128; do
  FILE="$ICONS_DIR/icon${size}.png"
  if [ -f "$FILE" ]; then
    echo "  Skipping icon${size}.png (already exists)"
    continue
  fi

  python3 -c "
import struct, zlib

size = $size
width, height = size, size

def write_png(filename, width, height):
    def chunk(chunk_type, data):
        c = chunk_type + data
        crc = struct.pack('>I', zlib.crc32(c) & 0xffffffff)
        return struct.pack('>I', len(data)) + c + crc

    header = b'\\x89PNG\\r\\n\\x1a\\n'
    ihdr = chunk(b'IHDR', struct.pack('>IIBBBBB', width, height, 8, 2, 0, 0, 0))

    raw = b''
    for y in range(height):
        raw += b'\\x00'
        for x in range(width):
            cx = x - width / 2
            cy = y - height / 2
            r = size * 0.38
            d = (cx*cx + cy*cy) ** 0.5

            ear_lx, ear_ly = -size*0.2, -size*0.28
            ear_rx, ear_ry = size*0.2, -size*0.28
            ear_d = size * 0.1

            eye_lx, eye_ly = -size*0.1, -size*0.05
            eye_rx, eye_ry = size*0.1, -size*0.05
            eye_d = size * 0.06

            nose_x, nose_y = 0, size*0.08
            nose_w, nose_h = size*0.12, size*0.08

            if d < r:
                if abs(cx - ear_lx) < ear_d*1.5 and abs(cy - ear_ly) < ear_d*1.5 and ((cx-ear_lx)**2+(cy-ear_ly)**2)**0.5 < ear_d:
                    if ((cx-ear_lx)**2+(cy-ear_ly)**2)**0.5 > ear_d*0.5:
                        raw += b'\\x88\\x88\\x88'
                    else:
                        raw += b'\\xcc\\xcc\\xcc'
                elif abs(cx - ear_rx) < ear_d*1.5 and abs(cy - ear_ry) < ear_d*1.5 and ((cx-ear_rx)**2+(cy-ear_ry)**2)**0.5 < ear_d:
                    if ((cx-ear_rx)**2+(cy-ear_ry)**2)**0.5 > ear_d*0.5:
                        raw += b'\\x88\\x88\\x88'
                    else:
                        raw += b'\\xcc\\xcc\\xcc'
                elif ((cx-eye_lx)**2+(cy-eye_ly)**2)**0.5 < eye_d:
                    raw += b'\\x33\\x33\\x33'
                elif ((cx-eye_rx)**2+(cy-eye_ry)**2)**0.5 < eye_d:
                    raw += b'\\x33\\x33\\x33'
                elif abs(cx - nose_x) < nose_w/2 and abs(cy - nose_y) < nose_h/2:
                    raw += b'\\x44\\x44\\x44'
                else:
                    base_color = int(140 + 40 * (1 - d/r))
                    raw += bytes([base_color, base_color, base_color])
            else:
                raw += b'\\x00\\x00\\x00'

    idat = chunk(b'IDAT', zlib.compress(raw))
    iend = chunk(b'IEND', b'')
    with open(filename, 'wb') as f:
        f.write(header + ihdr + idat + iend)

write_png('$FILE', width, height)
  "
  echo "  Created icon${size}.png"
done

echo "Icons generated."
