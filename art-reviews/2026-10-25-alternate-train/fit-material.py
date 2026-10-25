"""Registration only: nearest sample actual generated RGBA, remove low alpha; no drawing/recoloring."""
from pathlib import Path
from PIL import Image
import hashlib,json
folder=Path(__file__).parent
raw=Image.open(folder/'generated-source.png').convert('RGBA')
clean=raw.copy(); data=list(clean.getdata()); removed=sum(0<p[3]<32 for p in data)
clean.putdata([p if p[3]>=32 else (0,0,0,0) for p in data])
bounds=clean.getchannel('A').getbbox()
resized=clean.crop(bounds).resize((252,58),Image.Resampling.NEAREST)
out=Image.new('RGBA',(264,65),(0,0,0,0)); out.paste(resized,(9,5)); out.save(folder/'fitted-input.png')
sha=lambda p:hashlib.sha256(p.read_bytes()).hexdigest()
report={'generatedOriginalSha256':sha(folder/'generated-source.png'),'generatedSize':list(raw.size),'alphaDeletionThreshold':32,'removedLowAlphaPixels':removed,'cropLTRB':list(bounds),'nearestSize':[252,58],'canvasSize':[264,65],'pasteXY':[9,5],'wheelSupportYExclusive':63,'fittedSha256':sha(folder/'fitted-input.png'),'visibleAlphaBoundsLTRB':list(out.getchannel('A').getbbox()),'operation':'Only delete alpha<32, crop, nearest-resample generated RGBA, paste into transparent common canvas. No drawn colors or programmatic recoloring.'}
(folder/'partial-edit-report.json').write_text(json.dumps(report,indent=2)+'\n')
print(json.dumps(report))
