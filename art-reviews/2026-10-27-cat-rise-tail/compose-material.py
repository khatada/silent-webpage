"""Generated-source nearest registration and existing cell copy only; no artwork drawn."""
from pathlib import Path
from PIL import Image
import hashlib,json,shutil
folder=Path('art-reviews/2026-10-27-cat-rise-tail')
sha=lambda p:hashlib.sha256(p.read_bytes()).hexdigest()
raw=folder/'generated-source.png'
if not raw.exists():shutil.copyfile('/workspace/generated_images/exec-c8df2baa-6890-4761-bce5-6ff83f26d349.png',raw)
im=Image.open(raw).convert('RGBA');original=im.copy()
im.putdata([p if p[3]>=32 else (0,0,0,0) for p in im.getdata()])
crop=(259,353,1201,910);point=(1040,909);support=(218,190);scale=.21;size=(320,224)
local=im.crop(crop);px,py=point[0]-crop[0],point[1]-crop[1]
bridge=local.transform(size,Image.Transform.AFFINE,(1/scale,0,px-support[0]/scale,0,1/scale,py-support[1]/scale),resample=Image.Resampling.NEAREST,fillcolor=(0,0,0,0))
oldpath=Path('public/art/cat-rise.png');old=Image.open(oldpath).convert('RGBA')
sheet=Image.new('RGBA',(2240,224));old_checks=[]
for sourcecell,targetcell in [(0,0),(1,1),(2,2),(3,3),(4,5),(5,6)]:
 cell=old.crop((sourcecell*320,0,(sourcecell+1)*320,224));sheet.paste(cell,(targetcell*320,0))
 old_checks.append({'oldCell':sourcecell,'newCell':targetcell,'rgbaEqual':sheet.crop((targetcell*320,0,(targetcell+1)*320,224)).tobytes()==cell.tobytes()})
sheet.paste(bridge,(1280,0));sheet.save(folder/'composed-input.png')
bounds=bridge.getchannel('A').getbbox();assert bounds and bounds[0]>0 and bounds[1]>0 and bounds[2]<320 and bounds[3]<224
colors=set(im.getdata());unexpected=sum(1 for p in bridge.getdata() if p[3] and p not in colors);assert unexpected==0
report={'generatedOriginal':{'path':str(raw),'toolOriginalPath':'/workspace/generated_images/exec-c8df2baa-6890-4761-bce5-6ff83f26d349.png','sha256':sha(raw),'dimensions':original.size},'previousAtlas':{'path':str(oldpath),'sha256':sha(oldpath)},'canvas':size,'cells':7,'anchorX':192,'inheritedFootAnchorY':208,'newCell':4,'alphaDeletionThreshold':32,'cropLTRB':crop,'rawNearForepawPoint':point,'targetNearForepawSupport':support,'uniformScale':scale,'scaleBasis':'Generated strong-alpha ear-top353 to forepaw909 span556; one factor .21 yields116.76 source pixels, matching neighboring crouch/bridge ear-to-support span115-117. No per-part scale or warp.','registeredAlphaBounds':bounds,'tailUpperYApprox':103,'oldCellComparisons':old_checks,'newOpaqueRGBAOutsideGeneratedColors':unexpected,'inputSha256':sha(folder/'composed-input.png'),'operation':'Whole original RGBA retained; delete alpha<32 only, crop, one uniform affine nearest registration, translation, exact old-cell copy. No repaint, recolor, interpolation or anatomy warp.'}
(folder/'partial-edit-report.json').write_text(json.dumps(report,indent=2)+'\n')
print(json.dumps({'rawSHA':sha(raw),'bounds':bounds,'oldCellsExact':all(x['rgbaEqual'] for x in old_checks),'unexpectedColors':unexpected}))
