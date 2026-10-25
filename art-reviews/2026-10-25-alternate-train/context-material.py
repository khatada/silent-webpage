"""Arrange existing/generated image samples only, with nearest resampling; no art drawing."""
from pathlib import Path
from PIL import Image
import json
folder=Path(__file__).parent
old=Image.open(folder/'reference.png').convert('RGBA')
new=Image.open(folder/'candidate-corrected.png').convert('RGBA')
sheet=Image.open('public/art/tokyo-night.png').convert('RGBA').crop((0,0,360,184))
samples=[]
for i,s in enumerate([.24,.36,.48,.6]):
    size=(round(264*s),round(65*s)); y=4+i*45
    for name,im,x in [('existing-blue',old,10),('generated-red',new,190)]:
        sheet.alpha_composite(im.resize(size,Image.Resampling.NEAREST),(x,y))
        samples.append({'row':i,'material':name,'nominalScale':s,'roundedSize':list(size),'xy':[x,y]})
sheet.save(folder/'material-context-input.png')
(folder/'material-context.json').write_text(json.dumps({'description':'Left existing blue / right generated red, top to bottom .24/.36/.48/.6 nearest image samples. Actual generated sky crop as background. Not runtime GPU rendering.','samples':samples},indent=2)+'\n')
