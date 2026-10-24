"""Partial editing of imagegen art only: nearest sampling, RGBA copy, alpha deletion.

No colors, leaves, stems, pots, backgrounds, or shadows are drawn. A binary mask
selects existing generated leaf pixels; the reference pose supplies fixed parts.
Run from the repository root with Python/Pillow.
"""
import hashlib
import json
from pathlib import Path
from PIL import Image, ImageDraw

root = Path('art-reviews/2026-10-24-rooftop-plant')
source = Image.open(root / 'generated-source.png').convert('RGBA')
crop_rects = [(index * 612 + 40, -7, index * 612 + 640, 833) for index in range(3)]
frames = [source.crop(rect).resize((80, 112), Image.Resampling.NEAREST) for rect in crop_rects]
deleted = []
for image in frames:
    count = 0
    for y in range(112):
        for x in range(80):
            rgba = image.getpixel((x, y))
            if rgba[3] < 32:
                count += rgba[3] > 0
                image.putpixel((x, y), (0, 0, 0, 0))
    deleted.append(count)
base = frames[0]
mask = Image.new('L', (80, 112))
draw = ImageDraw.Draw(mask)
draw.rectangle((0, 0, 79, 69), fill=255)
draw.rectangle((37, 26, 43, 69), fill=0)
# Keep the original brown branch network and its one-pixel boundary unchanged.
# This selects generated colors; it does not generate or recolor artwork.
for y in range(70):
    for x in range(80):
        red, green, blue, alpha = base.getpixel((x, y))
        if alpha > 128 and red > green * 1.15 and red > blue * 1.1:
            draw.rectangle((x - 1, y - 1, x + 1, y + 1), fill=0)
atlas = Image.new('RGBA', (240, 112))
checks = []
for index, generated in enumerate(frames):
    selected = mask.copy()
    if index == 2:
        # The third generated pose invented an extra upper leaf. Retain the
        # complete neutral upper canopy instead; only its lower leaves move.
        ImageDraw.Draw(selected).rectangle((0, 0, 79, 37), fill=0)
    result = base.copy()
    result.paste(generated, (0, 0), selected)
    outside = sum(result.getpixel((x, y)) != base.getpixel((x, y))
                  for y in range(112) for x in range(80) if not selected.getpixel((x, y)))
    pot = sum(result.getpixel((x, y)) != base.getpixel((x, y))
              for y in range(70, 112) for x in range(80))
    stem = sum(result.getpixel((x, y)) != base.getpixel((x, y))
               for y in range(26, 70) for x in range(37, 44))
    assert outside == pot == stem == 0
    atlas.paste(result, (index * 80, 0))
    checks.append({'frame': index, 'maskOutsideChangedPixels': outside,
                   'potRows70Through111ChangedPixels': pot, 'mainStemChangedPixels': stem,
                   'lowAlphaSamplesDeletedBeforeComposition': deleted[index]})
atlas.save(root / 'composed-input.png')

# Material-only size/readability comparison over an unchanged generated floor.
floor = Image.open('public/art/tokyo-night.png').convert('RGBA').crop((320, 424, 392, 512))
context = Image.new('RGBA', (864, 1408))
for row, scale in enumerate([0.25, 0.375, 0.5, 0.625]):
    for index in range(3):
        panel = floor.copy()
        image = atlas.crop((index * 80, 0, (index + 1) * 80, 112))
        image = image.resize((round(80 * scale), round(112 * scale)), Image.Resampling.NEAREST)
        panel.alpha_composite(image, (36 - image.width // 2, 81 - image.height))
        panel = panel.resize((288, 352), Image.Resampling.NEAREST)
        context.paste(panel, (index * 288, row * 352))
context.save(root / 'material-context-input.png')
sha = lambda name: hashlib.sha256((root / name).read_bytes()).hexdigest()
(root / 'partial-edit-report.json').write_text(json.dumps({
    'method': 'Nearest sampling and copying only existing imagegen pixels, with low-alpha deletion. No pixels or colors drawn.',
    'generatedOriginal': 'generated-source.png', 'generatedOriginalSha256': sha('generated-source.png'),
    'correctionInput': 'composed-input.png', 'correctionInputSha256': sha('composed-input.png'),
    'generatedCropLTRB': crop_rects, 'nearestTargetSize': [80, 112],
    'mask': {'leafRegionInclusive': [0, 0, 79, 69], 'fixedStemInclusive': [37, 26, 43, 69],
             'fixedPotRows': [70, 111], 'branchProtection': 'Neutral opaque pixels with R>1.15G and R>1.1B, plus 1px square boundary.',
             'thirdPoseFixedUpperRows': [0, 37], 'alphaDeletionThresholdExclusive': 32},
    'frames': checks, 'foot': 111, 'anchorX': 40,
    'context': {'scales': [0.25, 0.375, 0.5, 0.625], 'displayEnlargement': 4,
                'floorCrop': [320, 424, 72, 88], 'meaning': 'Material readability only; production layout and GPU fixed-pot adoption remain for the runtime PR.'},
}, indent=2) + '\n')

corrected_path = root / 'candidate-corrected.png'
if corrected_path.exists():
    corrected = Image.open(corrected_path).convert('RGBA')
    changes = sum(corrected.getpixel((x, y)) != atlas.getpixel((x, y))
                  for y in range(112) for x in range(240))
    colors = set(source.getdata())
    new_visible_pixels = sum(corrected.getpixel((x, y)) not in colors
                             for y in range(112) for x in range(240)
                             if corrected.getpixel((x, y))[3])
    assert changes == new_visible_pixels == 0
    report_path = root / 'partial-edit-report.json'
    report = json.loads(report_path.read_text())
    report['afterCorrection'] = {'rgbaChangedFromInput': changes,
                                 'visiblePixelsNotCopiedFromGeneratedOriginal': new_visible_pixels}
    report_path.write_text(json.dumps(report, indent=2) + '\n')
