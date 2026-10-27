"""Display-only generated-pixel arrangement, no original artwork drawn."""
from pathlib import Path
from PIL import Image
import json
folder=Path(__file__).parent
sheet=Image.open(folder/'candidate-corrected.png').convert('RGBA')
background=Image.open('art-reviews/left-glass-scenes/portrait-large-corrected.png').convert('RGBA').crop((560,1320,880,1544))
scales=[.25,.375,.5,.625];out=Image.new('RGBA',(1400,424));y=0;rows=[]
for scale in scales:
 size=(round(320*scale),round(224*scale))
 for i in range(7):
  cat=sheet.crop((320*i,0,320*(i+1),224)).resize(size,Image.Resampling.NEAREST)
  bg=background.resize(size,Image.Resampling.NEAREST);bg.alpha_composite(cat);out.paste(bg,(i*size[0],y))
 rows.append({'scale':scale,'cellPixels':size,'rowY':y});y+=size[1]+8
out.save(folder/'material-context-input.png')
(folder/'material-context.json').write_text(json.dumps({'poseOrder':['old-neutral','lean','low-haunch','crouch','new-tail-intermediate','old-tail-bridge','stand'],'backgroundSource':'art-reviews/left-glass-scenes/portrait-large-corrected.png','backgroundCropLTRB':[560,1320,880,1544],'rows':rows,'limitations':'Nearest display-only native scale material check; production GPU timing is separately required.'},indent=2)+'\n')
