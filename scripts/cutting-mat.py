"""
Draws the board's background, a cutting mat at real scale (1 cm = 20 px, 1400 × 900 px): cm grid,
stronger every 5 cm, mm rulers top and left, 45° and 60° diagonals.
    python3 scripts/cutting-mat.py src/pages/Board/cutting-mat.svg
"""
import math, sys
W, H = 1400, 900          # board size in px
CM = 20                   # 1 cm = 20 px  → 70 × 45 cm
B = 34                    # ruler band (frame) width
x0, y0, x1, y1 = B, B, W - 12, H - 24   # grid area (rulers top/left, thin edge right/bottom)
o = []
a = o.append
a(f'<svg xmlns="http://www.w3.org/2000/svg" width="{W}" height="{H}" viewBox="0 0 {W} {H}" shape-rendering="crispEdges">')
a('<rect width="100%" height="100%" fill="#1d5a4b"/>')
a(f'<rect x="{x0}" y="{y0}" width="{x1-x0}" height="{y1-y0}" fill="#226753"/>')
# grid: every cm thin, every 5 cm stronger
for i, x in enumerate(range(x0, x1 + 1, CM)):
    strong = i % 5 == 0
    a(f'<line x1="{x}" y1="{y0}" x2="{x}" y2="{y1}" stroke="#fff" stroke-opacity="{0.42 if strong else 0.16}" stroke-width="{1.4 if strong else 1}"/>')
for j, y in enumerate(range(y0, y1 + 1, CM)):
    strong = j % 5 == 0
    a(f'<line x1="{x0}" y1="{y}" x2="{x1}" y2="{y}" stroke="#fff" stroke-opacity="{0.42 if strong else 0.16}" stroke-width="{1.4 if strong else 1}"/>')
# rulers: mm / half-cm / cm ticks in the frame, numbers every cm
for k in range(0, (x1 - x0) * 10 // CM + 1):
    x = x0 + k * CM / 10
    l = 13 if k % 10 == 0 else 8 if k % 5 == 0 else 4
    a(f'<line x1="{x:.1f}" y1="{y0}" x2="{x:.1f}" y2="{y0-l}" stroke="#fff" stroke-opacity="0.75" stroke-width="1"/>')
for k in range(0, (y1 - y0) * 10 // CM + 1):
    y = y0 + k * CM / 10
    l = 13 if k % 10 == 0 else 8 if k % 5 == 0 else 4
    a(f'<line x1="{x0}" y1="{y:.1f}" x2="{x0-l}" y2="{y:.1f}" stroke="#fff" stroke-opacity="0.75" stroke-width="1"/>')
a('<g fill="#fff" fill-opacity="0.85" font-family="Arial, Helvetica, sans-serif" font-size="9" text-anchor="middle">')
for c in range(1, (x1 - x0) // CM + 1):
    a(f'<text x="{x0 + c*CM}" y="{y0-16}">{c}</text>')
for c in range(1, (y1 - y0) // CM + 1):
    a(f'<text x="{x0-22}" y="{y0 + c*CM + 3}">{c}</text>')
a('</g>')
# big numbers every 5 cm along the bottom and left inner edge, like the mat's inch numbers
a('<g fill="#fff" fill-opacity="0.9" font-family="Arial, Helvetica, sans-serif" font-size="15" font-weight="bold">')
for c in range(5, (x1 - x0) // CM, 5):
    a(f'<text x="{x0 + c*CM + 3}" y="{y1-5}">{c}</text>')
for c in range(5, (y1 - y0) // CM, 5):
    a(f'<text x="{x0+4}" y="{y0 + c*CM - 4}">{c}</text>')
a('</g>')
a(f'<text x="8" y="{y0-6}" fill="#fff" fill-opacity="0.85" font-family="Arial, Helvetica, sans-serif" font-size="9" font-weight="bold">cm</text>')
# diagonals (45° pair crossing the centre, one 60°), as on a cutting mat
cx, cy = (x0 + x1) / 2, (y0 + y1) / 2
h = (y1 - y0) / 2
g = '<line x1="{:.0f}" y1="{:.0f}" x2="{:.0f}" y2="{:.0f}" stroke="#fff" stroke-opacity="0.55" stroke-width="1.6" shape-rendering="geometricPrecision"/>'
a(g.format(cx - h, y1, cx + h, y0))
a(g.format(cx - h, y0, cx + h, y1))
d60 = (y1 - y0) / math.tan(math.radians(60))
sx = x0 + 6 * CM
a(g.format(sx, y1, sx + d60, y0))
lab = '<text x="{:.0f}" y="{:.0f}" fill="#fff" fill-opacity="0.95" font-family="Arial, Helvetica, sans-serif" font-size="15" font-weight="bold" paint-order="stroke" stroke="#226753" stroke-width="5">{}</text>'
# labels next to their line, a quarter of the way up (45°) and halfway (60°)
a(lab.format(cx - h + 0.25 * 2 * h + 10, y1 - 0.25 * 2 * h + 5, '45°'))
a(lab.format(sx + 0.5 * d60 + 10, y1 - 0.5 * (y1 - y0) + 5, '60°'))
a(f'<rect x="{x0}" y="{y0}" width="{x1-x0}" height="{y1-y0}" fill="none" stroke="#fff" stroke-opacity="0.8" stroke-width="1.5"/>')
a('</svg>')
open(sys.argv[1], 'w', encoding='utf-8').write('\n'.join(o))
