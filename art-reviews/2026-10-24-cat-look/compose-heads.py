"""Permitted partial edit: copy generated heads onto unchanged reviewed seated bodies.

No colors, fur, outlines, or anatomical features are drawn. The polygon selects
existing generated pixels; nearest resampling and RGBA copying are the only edits.
Run from the repository root with Python and Pillow.
"""
import hashlib
import json
from pathlib import Path
from PIL import Image, ImageDraw

root = Path('art-reviews/2026-10-24-cat-look')
base = Image.open(root / 'sitting-reference-native.png').convert('RGBA')
source = Image.open(root / 'generated-source.png').convert('RGBA')
regions = [(0, 0, 800, 1006), (780, 0, 1563, 1006)]
polygon = [(40, 0), (107, 0), (107, 57), (60, 57), (41, 44)]
mask = Image.new('L', base.size)
ImageDraw.Draw(mask).polygon(polygon, fill=255)
atlas = Image.new('RGBA', (216, 139))
checks = []
for index, rectangle in enumerate(regions):
    generated = source.crop(rectangle).resize(base.size, Image.Resampling.NEAREST)
    frame = base.copy()
    frame.paste(generated, (0, 0), mask)
    outside_changes = sum(frame.getpixel((x, y)) != base.getpixel((x, y))
                          for y in range(139) for x in range(108)
                          if not mask.getpixel((x, y)))
    lower_changes = sum(frame.getpixel((x, y)) != base.getpixel((x, y))
                        for y in range(58, 139) for x in range(108))
    assert outside_changes == lower_changes == 0
    atlas.paste(frame, (index * 108, 0))
    checks.append({'frame': index, 'outsideHeadMaskChangedPixels': outside_changes,
                   'rows58Through138ChangedPixels': lower_changes,
                   'unchangedLowerBodyPixels': 108 * 81})
atlas.save(root / 'composed-input.png')
sha = lambda name: hashlib.sha256((root / name).read_bytes()).hexdigest()
(root / 'partial-edit-report.json').write_text(json.dumps({
    'method': 'Nearest sampling of imagegen head/neck only, copied through a binary polygon onto the exact existing seated sprite. No generated body pixels adopted, no artwork drawn.',
    'generatedOriginal': 'generated-source.png',
    'generatedOriginalSha256': sha('generated-source.png'),
    'reference': 'sitting-reference-native.png',
    'referenceSha256': sha('sitting-reference-native.png'),
    'output': 'composed-input.png',
    'correctionInputSha256': sha('composed-input.png'),
    'generatedCropLTRB': regions,
    'nearestTargetSize': [108, 139],
    'headMaskPolygon': polygon,
    'frames': checks,
    'frameSize': [108, 139], 'foot': 138, 'anchorX': 54,
}, indent=2) + '\n')

# Material-only context, not production display adoption. Background is an
# unchanged crop of reviewed generated art; rows show scale 1, .5, .25, .125.
background = Image.open('public/art/tokyo-night.png').convert('RGBA')
qa = Image.new('RGBA', (1296, 1100))
y = 0
for factor in [1, 0.5, 0.25, 0.125]:
    strip = background.crop((300, 360, 624, 499))
    strip.alpha_composite(base, (0, 0))
    strip.alpha_composite(atlas, (108, 0))
    strip = strip.resize((round(324 * factor), round(139 * factor)), Image.Resampling.NEAREST)
    shown = strip.resize((strip.width * 4, strip.height * 4), Image.Resampling.NEAREST)
    qa.paste(shown, (0, y))
    y += shown.height + 8
qa.crop((0, 0, 1296, y)).save(root / 'material-scale-context-input.png')

corrected_path = Path('public/art/cat-look.png')
if corrected_path.exists():
    corrected = Image.open(corrected_path).convert('RGBA')
    rgba_changes = sum(corrected.getpixel((x, y)) != atlas.getpixel((x, y))
                       for y in range(139) for x in range(216))
    lower_changes = [sum(corrected.getpixel((index * 108 + x, y)) != base.getpixel((x, y))
                         for y in range(58, 139) for x in range(108)) for index in range(2)]
    assert rgba_changes == 0 and lower_changes == [0, 0]
    report_path = root / 'partial-edit-report.json'
    report = json.loads(report_path.read_text())
    report['afterCorrection'] = {'rgbaChangedFromInput': rgba_changes,
                                 'eachFrameLowerRows58Through138ChangedFromOriginal': lower_changes}
    report_path.write_text(json.dumps(report, indent=2) + '\n')
