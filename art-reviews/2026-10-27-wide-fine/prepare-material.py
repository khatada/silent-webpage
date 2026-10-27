"""Partial generated-image crop/nearest size adjustment only; creates no original artwork.
Run the repository correction tool between the two explicitly selected stages:
python prepare-material.py crop
node --import tsx scripts/correct-pixel-art.ts --input <folder>/cropped-input.png --output <folder>/corrected-cell1.png --cell-size 1 --scale 1
python prepare-material.py resize
node --import tsx scripts/correct-pixel-art.ts --input <folder>/nearest-resized-input.png --output <folder>/nearest-final-corrected.png --cell-size 1 --scale 1
Outputs are preserved rather than silently overwritten.
"""
from PIL import Image
from pathlib import Path
import sys
folder=Path(__file__).parent
stage=sys.argv[1]
if stage=='crop':
 target=folder/'cropped-input.png';assert not target.exists()
 Image.open(folder/'generated-source.png').crop((0,0,2169,723)).save(target)
elif stage=='resize':
 target=folder/'nearest-resized-input.png';assert not target.exists()
 Image.open(folder/'corrected-cell1.png').resize((1446,482),Image.Resampling.NEAREST).save(target)
else:raise ValueError('Choose crop or resize')
