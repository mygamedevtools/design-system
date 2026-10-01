"""Generates the H1 mark and wordmark lockups in assets/logo/.

The mark: a pointy-top hexagon frame with three rounded axes (up, down-left,
down-right) and a center dot, drawn on a 100x100 grid. Colors come from
tokens/base/color.json so the logo can't drift from the palette.

Outputs:
  assets/logo/svg/mark-{light,dark,mono}.svg   mark only
  assets/logo/svg/favicon.svg                  mark that follows the OS color scheme
  assets/logo/svg/lockup-{horizontal,stacked}-{light,dark}.svg
                                               mark + "MY GAMEDEV TOOLS", text outlined
  assets/logo/png/mark-{light,dark}-{size}.png transparent PNGs for stores and social images

"light"/"dark" name the background the asset is meant for.

Requires: pip install -r scripts/requirements.txt
"""

import json
from pathlib import Path

import uharfbuzz as hb
from fontTools.pens.svgPathPen import SVGPathPen
from fontTools.pens.transformPen import TransformPen
from fontTools.ttLib import TTFont
from PIL import Image, ImageDraw

ROOT = Path(__file__).resolve().parent.parent
OUT_SVG = ROOT / "assets/logo/svg"
OUT_PNG = ROOT / "assets/logo/png"
DISPLAY_FONT = ROOT / "assets/fonts/russo-one/RussoOne-Regular.ttf"
WORDMARK = "MY GAMEDEV TOOLS"

palette = {
    k: v["$value"]
    for k, v in json.loads((ROOT / "tokens/base/color.json").read_text())["palette"].items()
    if isinstance(v, dict) and "$value" in v
}

# Colors per background, matching tokens/themes/*.json mark-* roles.
SCHEMES = {
    "light": {"frame": palette["ink"], "axes": [palette["tomato"], palette["amber-deep"], palette["teal-deep"]]},
    "dark": {"frame": palette["cream"], "axes": [palette["tomato"], palette["amber"], palette["teal"]]},
}

HEX = [(50, 6), (88.1, 28), (88.1, 72), (50, 94), (11.9, 72), (11.9, 28)]
CENTER = (50, 50)
AXES = [(50, 24), (27.5, 63), (72.5, 63)]
FRAME_W, AXIS_W, DOT_R = 7, 12, 8


def mark_elements(frame, axes, indent="  "):
    pts = " ".join(f"{x:g},{y:g}" for x, y in HEX)
    lines = "".join(
        f'{indent}  <line x1="50" y1="50" x2="{x:g}" y2="{y:g}" stroke="{c}"/>\n' for (x, y), c in zip(AXES, axes)
    )
    return (
        f'{indent}<polygon points="{pts}" fill="none" stroke="{frame}" stroke-width="{FRAME_W}" stroke-linejoin="round"/>\n'
        f'{indent}<g stroke-width="{AXIS_W}" stroke-linecap="round">\n{lines}{indent}</g>\n'
        f'{indent}<circle cx="50" cy="50" r="{DOT_R}" fill="{frame}"/>\n'
    )


def svg(view_w, view_h, body, title="My Gamedev Tools"):
    return (
        f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {view_w:g} {view_h:g}" role="img">\n'
        f"  <title>{title}</title>\n{body}</svg>\n"
    )


def text_path(text, cap_height, x, baseline):
    """Shape text with HarfBuzz (kerning included) and return one SVG path."""
    font = TTFont(DISPLAY_FONT)
    face = hb.Face(hb.Blob.from_file_path(str(DISPLAY_FONT)))
    hb_font = hb.Font(face)
    buf = hb.Buffer()
    buf.add_str(text)
    buf.guess_segment_properties()
    hb.shape(hb_font, buf, {"kern": True, "liga": True})

    scale = cap_height / font["OS/2"].sCapHeight
    glyph_set = font.getGlyphSet()
    order = font.getGlyphOrder()
    pen = SVGPathPen(glyph_set, ntos=lambda v: f"{v:.2f}".rstrip("0").rstrip("."))
    pen_x = 0
    for info, pos in zip(buf.glyph_infos, buf.glyph_positions):
        transform = (scale, 0, 0, -scale, x + (pen_x + pos.x_offset) * scale, baseline - pos.y_offset * scale)
        glyph_set[order[info.codepoint]].draw(TransformPen(pen, transform))
        pen_x += pos.x_advance
    return pen.getCommands(), round(pen_x * scale, 2)


def write(path, content):
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(content)
    print("wrote", path.relative_to(ROOT))


def build_svgs():
    for name, s in SCHEMES.items():
        write(OUT_SVG / f"mark-{name}.svg", svg(100, 100, mark_elements(s["frame"], s["axes"])))

    write(OUT_SVG / "mark-mono.svg", svg(100, 100, mark_elements("currentColor", ["currentColor"] * 3)))

    light, dark = SCHEMES["light"], SCHEMES["dark"]
    favicon_style = (
        "  <style>\n"
        f"    .f{{stroke:{light['frame']}}} .d{{fill:{light['frame']}}}"
        f" .a1{{stroke:{light['axes'][0]}}} .a2{{stroke:{light['axes'][1]}}} .a3{{stroke:{light['axes'][2]}}}\n"
        f"    @media (prefers-color-scheme: dark) {{ .f{{stroke:{dark['frame']}}} .d{{fill:{dark['frame']}}}"
        f" .a2{{stroke:{dark['axes'][1]}}} .a3{{stroke:{dark['axes'][2]}}} }}\n"
        "  </style>\n"
    )
    pts = " ".join(f"{x:g},{y:g}" for x, y in HEX)
    favicon_body = (
        favicon_style
        + f'  <polygon class="f" points="{pts}" fill="none" stroke-width="{FRAME_W}" stroke-linejoin="round"/>\n'
        + f'  <g stroke-width="{AXIS_W}" stroke-linecap="round">\n'
        + "".join(f'    <line class="a{i + 1}" x1="50" y1="50" x2="{x:g}" y2="{y:g}"/>\n' for i, (x, y) in enumerate(AXES))
        + "  </g>\n"
        + f'  <circle class="d" cx="50" cy="50" r="{DOT_R}"/>\n'
    )
    write(OUT_SVG / "favicon.svg", svg(100, 100, favicon_body))

    gap = 26
    for name, s in SCHEMES.items():
        # Horizontal: one line, cap height 40% of the mark.
        d, width = text_path(WORDMARK, 40, 100 + gap, 70)
        body = mark_elements(s["frame"], s["axes"]) + f'  <path d="{d}" fill="{s["frame"]}"/>\n'
        write(OUT_SVG / f"lockup-horizontal-{name}.svg", svg(100 + gap + width, 100, body))

        # Stacked: two lines next to the mark.
        d1, w1 = text_path("MY GAMEDEV", 30, 100 + gap, 44)
        d2, w2 = text_path("TOOLS", 30, 100 + gap, 86)
        body = (
            mark_elements(s["frame"], s["axes"])
            + f'  <path d="{d1}" fill="{s["frame"]}"/>\n  <path d="{d2}" fill="{s["frame"]}"/>\n'
        )
        write(OUT_SVG / f"lockup-stacked-{name}.svg", svg(100 + gap + max(w1, w2), 100, body))


def draw_mark(size, scheme, supersample=8):
    """Rasterize the mark with Pillow at a high resolution, then downsample."""
    s = size * supersample
    k = s / 100
    img = Image.new("RGBA", (s, s), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)

    def stroke_line(p, q, width, color):
        p, q = (p[0] * k, p[1] * k), (q[0] * k, q[1] * k)
        w = width * k
        draw.line([p, q], fill=color, width=round(w))
        for x, y in (p, q):
            draw.ellipse([x - w / 2, y - w / 2, x + w / 2, y + w / 2], fill=color)

    for i in range(len(HEX)):
        stroke_line(HEX[i], HEX[(i + 1) % len(HEX)], FRAME_W, scheme["frame"])
    for end, color in zip(AXES, scheme["axes"]):
        stroke_line(CENTER, end, AXIS_W, color)
    r = DOT_R * k
    draw.ellipse([50 * k - r, 50 * k - r, 50 * k + r, 50 * k + r], fill=scheme["frame"])
    return img.resize((size, size), Image.LANCZOS)


def build_pngs():
    OUT_PNG.mkdir(parents=True, exist_ok=True)
    for name, scheme in SCHEMES.items():
        for size in (16, 32, 48, 64, 128, 256, 512):
            draw_mark(size, scheme).save(OUT_PNG / f"mark-{name}-{size}.png")
    print("wrote", OUT_PNG.relative_to(ROOT))


if __name__ == "__main__":
    build_svgs()
    build_pngs()
