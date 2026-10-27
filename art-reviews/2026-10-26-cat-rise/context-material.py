"""Display-only arrangement of corrected generated pixels on a copied reviewed rooftop crop."""
from pathlib import Path
from PIL import Image
import json
folder=Path(__file__).parent
sheet=Image.open(folder/'candidate-corrected.png').convert('RGBA')
background=Image.open('art-reviews/left-glass-scenes/portrait-large-corrected.png').convert('RGBA').crop((560,1320,880,1544))
background.save(folder/'context-floor-reference.png')
scales=[.25,.375,.5,.625];out=Image.new('RGBA',(1200,424));y=0;rows=[]
for scale in scales:
    size=(round(320*scale),round(224*scale))
    for i in range(6):
        cat=sheet.crop((i*320,0,(i+1)*320,224)).resize(size,Image.Resampling.NEAREST)
        bg=background.resize(size,Image.Resampling.NEAREST);bg.alpha_composite(cat);out.paste(bg,(i*size[0],y))
    rows.append({'scale':scale,'cellPixels':size,'rowY':y});y+=size[1]+8
out.save(folder/'material-context-input.png')
(folder/'material-context.json').write_text(json.dumps({'description':'Corrected sixposes on copied previously reviewed rooftop floor, top to bottom .25/.375/.5/.625 native nearest samples; not runtime GPU rendering. Every row reads neutral/lean/lowhaunch/crouch/tailbridge/stand.','poseOrder':['old-neutral','lean','low-haunch','crouch','tail-bridge','stand'],'backgroundSource':'art-reviews/left-glass-scenes/portrait-large-corrected.png','backgroundCropLTRB':[560,1320,880,1544],'rows':rows},indent=2)+'\n')
