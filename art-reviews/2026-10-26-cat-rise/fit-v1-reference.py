"""Read-only-generation reference fitting: crop/nearest/translation generated RGBA only; no pose drawing."""
from pathlib import Path
from PIL import Image
import json,hashlib
folder=Path(__file__).parent
raw=Image.open(folder/'generated-source-v1.png').convert('RGBA')
source=raw.copy();source.putdata([p if p[3]>=32 else (0,0,0,0) for p in raw.getdata()])
scale=135/346
rects=[(0,0,547,510),(547,0,1048,510),(1048,0,1641,510),(0,510,547,958),(547,510,1094,958),(1094,510,1641,958)]
supports=[(354,444),(929,456),(1518,457),(444,889),(984,889),(1518,890)]
sheet=Image.new('RGBA',(320*6,224));neutral=Image.open(folder/'sitting-reference.png').convert('RGBA');sheet.paste(neutral,(64,0))
rows=[]
for i,(rect,point) in enumerate(zip(rects,supports)):
    if i==0: continue
    crop=source.crop(rect);px,py=point[0]-rect[0],point[1]-rect[1]
    frame=crop.transform((320,224),Image.Transform.AFFINE,(1/scale,0,px-214/scale,0,1/scale,py-190/scale),resample=Image.Resampling.NEAREST,fillcolor=(0,0,0,0))
    sheet.paste(frame,(320*i,0));rows.append({'pose':i,'cropLTRB':rect,'sourceFrontSupport':point,'sharedScale':scale,'targetFrontSupport':[214,190],'visibleBounds':frame.getchannel('A').getbbox()})
sheet.save(folder/'v1-fit-input.png')
report={'generatedOriginalSha256':hashlib.sha256((folder/'generated-source-v1.png').read_bytes()).hexdigest(),'commonCell':[320,224],'anchorX':192,'foot':208,'neutralSource':'sitting-reference.png','neutralPasteXY':[64,0],'uniformScale':scale,'scaleBasis':'existing seated alpha>=128 height135 / generated pose0 corresponding height346','alphaDeletionThreshold':32,'operation':'Only original generated RGBA crop, one shared affine-nearest scale, translation and lowalpha deletion. Existing neutral endpoint copied unchanged. No drawing/recoloring/pose morphing.','poses':rows,'status':'reference-registration-only-not-public-adoption'}
(folder/'v1-fit-report.json').write_text(json.dumps(report,indent=2)+'\n')
