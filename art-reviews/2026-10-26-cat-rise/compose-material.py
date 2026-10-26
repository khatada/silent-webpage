"""Only copy generated RGBA with per-source uniform nearest registration; no new pose pixels."""
from pathlib import Path
from PIL import Image
import json,hashlib
folder=Path(__file__).parent
sha=lambda p:hashlib.sha256(p.read_bytes()).hexdigest()
canvas=(320,224);support=(218,190)
raws={n:Image.open(folder/f'generated-source-{n}.png').convert('RGBA') for n in ['v1','v2']}
clean={}
for n,im in raws.items():
    clean[n]=im.copy();clean[n].putdata([p if p[3]>=32 else (0,0,0,0) for p in im.getdata()])
# Same factor for all poses from one generated source; the two files have different physical resolutions.
specs=[
 {'source':'v1','rawPose':1,'name':'lean','crop':(547,0,1048,510),'point':(921,459),'scale':135/346},
 {'source':'v2','rawPose':0,'name':'low-haunch','crop':(0,0,1060,742),'point':(887,651),'scale':.24},
 {'source':'v1','rawPose':2,'name':'high-crouch','crop':(1048,0,1641,510),'point':(1516,457),'scale':135/346},
 {'source':'v2','rawPose':1,'name':'tail-bridge','crop':(1060,0,2120,742),'point':(1902,651),'scale':.24},
 {'source':'v1','rawPose':5,'name':'neutral-standing','crop':(1094,510,1641,958),'point':(1513,891),'scale':135/346},
]
sheet=Image.new('RGBA',(canvas[0]*6,canvas[1]));neutral=Image.new('RGBA',canvas);neutral.paste(Image.open(folder/'sitting-reference.png').convert('RGBA'),(64,0));sheet.paste(neutral,(0,0))
records=[]
for i,spec in enumerate(specs,1):
    r=spec['crop'];im=clean[spec['source']].crop(r);scale=spec['scale'];px,py=spec['point'][0]-r[0],spec['point'][1]-r[1]
    frame=im.transform(canvas,Image.Transform.AFFINE,(1/scale,0,px-support[0]/scale,0,1/scale,py-support[1]/scale),resample=Image.Resampling.NEAREST,fillcolor=(0,0,0,0))
    bounds=frame.getchannel('A').getbbox();assert bounds and bounds[0]>0 and bounds[1]>0 and bounds[2]<canvas[0] and bounds[3]<canvas[1],(i,bounds)
    sheet.paste(frame,(i*canvas[0],0));records.append({'cell':i,**spec,'targetForepawSupport':support,'registeredAlphaBounds':bounds})
sheet.save(folder/'composed-input.png')
report={'canvas':canvas,'cells':6,'anchorX':192,'inheritedFootAnchorY':208,'frontPawLandmark':support,'frontPawLandmarkMeaning':'Near forepaw pad lower-right contact. Approximate original reference support region; tiny initial weight transfer is allowed, no whole-body sliding.','neutralSource':'sitting-reference.png','neutralPasteXY':[64,0],'neutralFullRGBAEqual':sheet.crop((0,0,*canvas)).tobytes()==neutral.tobytes(),'alphaDeletionThreshold':32,'uniformScaleBySource':{'v1':135/346,'v2':.24},'scaleBasis':{'v1':'Existing seated strong-alpha height135 / generated neutral strong-alpha height346','v2':'One factor .24 matches head/ear-to-support span of both poses to the registered v1 family; no per-pose resizing'},'poses':records,'generatedOriginals':{n:{'path':str((folder/f'generated-source-{n}.png').resolve().relative_to(Path.cwd().resolve())),'sha256':sha(folder/f'generated-source-{n}.png')} for n in raws},'inputSha256':sha(folder/'composed-input.png'),'operation':'Only existing neutral RGBA copy, generated source crop, alpha<32 deletion, shared affine-nearest scale per source, and support translation. No drawn/recolored/warped anatomical pixels.'}
(folder/'partial-edit-report.json').write_text(json.dumps(report,indent=2)+'\n')
