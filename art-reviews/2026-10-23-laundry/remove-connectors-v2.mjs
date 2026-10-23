import { readFileSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { PNG } from 'pngjs';
const directory = new URL('./', import.meta.url);
const input = new URL('source.png', directory), output = new URL('source-cleaned-v2.png', directory);
const raw = readFileSync(input), original = PNG.sync.read(raw);
const cleaned = PNG.sync.read(raw);
// Only the generated inter-towel connector band is removed. No pixels are added or recolored.
const correctedRects = [[67,51,9,9],[200,51,10,9],[334,51,10,9],[469,51,11,9]];
const rectangles = correctedRects.map(([x,y,w,h]) => [x*4,y*4,w*4,h*4]);
const perRectangle = [];
for (const [x,y,w,h] of rectangles) {
  let deletedVisiblePixels = 0, changedPixels = 0;
  for(let yy=y;yy<y+h;yy++) for(let xx=x;xx<x+w;xx++) {
    const index=(yy*cleaned.width+xx)*4;
    if(cleaned.data[index+3]) deletedVisiblePixels++;
    if(cleaned.data.subarray(index,index+4).some(value=>value!==0)) changedPixels++;
    cleaned.data.fill(0,index,index+4);
  }
  perRectangle.push({rawRect:[x,y,w,h],deletedVisiblePixels,changedPixels});
}
let keptPixels=0, outsideChanges=0;
for(let y=0;y<original.height;y++)for(let x=0;x<original.width;x++) {
  if(rectangles.some(([rx,ry,rw,rh])=>x>=rx&&x<rx+rw&&y>=ry&&y<ry+rh))continue;
  const i=(y*original.width+x)*4;keptPixels++;
  if(!original.data.subarray(i,i+4).equals(cleaned.data.subarray(i,i+4)))outsideChanges++;
}
if(outsideChanges)throw new Error('Pixels outside the declared deletions changed');
const encoded=PNG.sync.write(cleaned);writeFileSync(output,encoded,{flag:'wx'});
const hash=buffer=>createHash('sha256').update(buffer).digest('hex');
writeFileSync(new URL('connector-removal-v2.json',directory),JSON.stringify({method:'Partial deletion of generated connector pixels only; selected rectangles become transparent RGBA zero. No original artwork drawn. Minor adjoining top-border pixels may be removed; visual review required.',input:'source.png',output:'source-cleaned-v2.png',originalSha256:hash(raw),cleanedSha256:hash(encoded),correctedGridCellSize:4,correctedRects,perRectangle,keptPixels,keptRGBAUnchanged:outsideChanges===0,outsideChangedPixels:outsideChanges},null,2)+'\n',{flag:'wx'});
