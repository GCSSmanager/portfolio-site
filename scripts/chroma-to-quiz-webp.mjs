/**
 * Quiz icons: generate on solid magenta/chroma, then:
 *   node scripts/chroma-to-quiz-webp.mjs <src.jpg> <assets/out.webp>
 */
import { spawnSync } from 'node:child_process'

const [, , src, dst] = process.argv
if (!src || !dst) {
  console.error('Usage: node scripts/chroma-to-quiz-webp.mjs <src> <dst.webp>')
  process.exit(1)
}

const py = `
from PIL import Image
import math
from collections import deque
import sys

src, dst = sys.argv[1], sys.argv[2]
MAX_SIDE = 512
FLOOD_TOL = 58

def dist(a, b):
    return math.sqrt(sum((x - y) ** 2 for x, y in zip(a, b)))

def corner_bg(rgb):
    w, h = rgb.size
    pts = [(0, 0), (w - 1, 0), (0, h - 1), (w - 1, h - 1)]
    rs = gs = bs = 0
    for x, y in pts:
        r, g, b = rgb.getpixel((x, y))
        rs += r
        gs += g
        bs += b
    return (rs // 4, gs // 4, bs // 4)

def is_chroma_bg(bg):
    r, g, b = bg
    if r > 100 and b > 90 and g < 130 and (r + b) > 2 * g + 80:
        return True
    if r > 170 and g < 45 and 55 < b < 170:
        return True
    return False

def is_brand(r, g, b):
    if r < 95 and g < 110 and b < 95 and g >= r - 8 and g >= b - 8:
        return True
    if r > 165 and g > 115 and b < 155 and r >= g - 15:
        return True
    # ivory/cream (not pink chroma fringe)
    if (
        r > 195
        and g > 180
        and b > 155
        and max(r, g, b) - min(r, g, b) < 55
        and (b - g) < 12
        and r >= b - 20
    ):
        return True
    return False

def is_purple(r, g, b, bg):
    if is_brand(r, g, b):
        return False
    if dist((r, g, b), bg) <= FLOOD_TOL + 10:
        return True
    if r > 130 and b > 115 and g < 120 and (r - g) > 28 and (b - g) > 22:
        return True
    if r > 200 and b > 165 and g < 165 and (r + b) > 2 * g + 55:
        return True
    if r > 215 and b > 185 and (b - g) > 10:
        return True
    return False

rgb = Image.open(src).convert('RGB')
bg = corner_bg(rgb)
if not is_chroma_bg(bg):
    raise SystemExit(f'Background at corners is not chroma (got {bg}). Regenerate on purple/magenta only.')

im = rgb.convert('RGBA')
w, h = im.size
px = im.load()

def is_key(r, g, b):
    return dist((r, g, b), bg) <= FLOOD_TOL

vis = bytearray(w * h)
q = deque()
for x in range(w):
    for y in (0, h - 1):
        if is_key(*px[x, y][:3]):
            vis[y * w + x] = 1
            q.append((x, y))
for y in range(h):
    for x in (0, w - 1):
        i = y * w + x
        if not vis[i] and is_key(*px[x, y][:3]):
            vis[i] = 1
            q.append((x, y))
while q:
    x, y = q.popleft()
    px[x, y] = (0, 0, 0, 0)
    for nx, ny in ((x - 1, y), (x + 1, y), (x, y - 1), (x, y + 1)):
        if 0 <= nx < w and 0 <= ny < h:
            i = ny * w + nx
            if not vis[i] and is_key(*px[nx, ny][:3]):
                vis[i] = 1
                q.append((nx, ny))

for y in range(h):
    for x in range(w):
        r, g, b, a = px[x, y]
        if a and is_purple(r, g, b, bg):
            px[x, y] = (0, 0, 0, 0)

for _ in range(6):
    for y in range(h):
        for x in range(w):
            r, g, b, a = px[x, y]
            if a < 1:
                continue
            if not is_purple(r, g, b, bg):
                continue
            if a < 245:
                px[x, y] = (0, 0, 0, 0)
                continue
            for nx, ny in ((x - 1, y), (x + 1, y), (x, y - 1), (x, y + 1)):
                if 0 <= nx < w and 0 <= ny < h and px[nx, ny][3] < 1:
                    px[x, y] = (0, 0, 0, 0)
                    break

bbox = im.split()[3].getbbox()
if bbox:
    im = im.crop(bbox)
w, h = im.size
s = MAX_SIDE / max(w, h)
im = im.resize((max(1, round(w * s)), max(1, round(h * s))), Image.Resampling.LANCZOS)
im.save(dst, 'WEBP', quality=94, method=6)
print(im.size)
`

const r = spawnSync('python3', ['-c', py, src, dst], { encoding: 'utf8' })
if (r.status !== 0) {
  console.error(r.stderr)
  process.exit(r.status ?? 1)
}
process.stdout.write(r.stdout)
