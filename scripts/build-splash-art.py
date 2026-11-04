"""Build the bundled native launch image with Pillow; never touches app data."""
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parent.parent
SCALE = 3
image = Image.new('RGBA', (280 * SCALE, 208 * SCALE), (0, 0, 0, 0))
draw = ImageDraw.Draw(image)

def point(p):
    return ((65 + p[0] * 150 / 160) * SCALE, p[1] * 150 / 160 * SCALE)

def curve(start, control1, control2, end):
    return [tuple((1-t)**3 * start[i] + 3*(1-t)**2*t * control1[i] + 3*(1-t)*t*t * control2[i] + t**3 * end[i] for i in (0, 1)) for t in [n/60 for n in range(61)]]

left = curve((124,36),(85,48),(36,69),(13,112)) + curve((13,112),(37,110),(58,101),(71,85)) + curve((71,85),(88,63),(103,46),(124,36))
right = curve((133,36),(110,52),(112,72),(106,95)) + curve((106,95),(100,122),(88,143),(65,143)) + [(44,143)] + curve((44,143),(59,124),(79,112),(88,94)) + curve((88,94),(98,74),(99,54),(133,36))
for path in (left, right):
    draw.polygon([point(p) for p in path], fill='#0C6C60')
draw.ellipse([point((121,9)), point((143,31))], fill='#0C6C60')
font = ImageFont.truetype('C:/Windows/Fonts/malgunbd.ttf', 28 * SCALE)
draw.text((140 * SCALE, 166 * SCALE), '장기요양길잡이', font=font, anchor='mt', fill='#0C6C60')
image.save(ROOT / 'assets/images/launch-splash.png')
