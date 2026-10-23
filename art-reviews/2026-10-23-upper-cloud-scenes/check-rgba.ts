import { readFileSync, writeFileSync } from 'node:fs';
import { PNG } from 'pngjs';
import { generatedLayout } from '../../src/generated-layout';
import { upperCloudGeometry } from '../../src/image-upper-cloud';
import { travelPosition } from '../../src/animation';
const root = 'art-reviews/2026-10-23-upper-cloud-scenes';
const views = [['desktop',1440,900,1],['mobile',390,844,2],['narrow',295,844,1],['landscape',844,390,2],
  ['wide',2560,1080,1],['compact',800,600,1],['tall',390,1025,2],['portrait-large',900,1600,1],
  ['portrait-boundary',1024,1537,1],['small-phone',320,568,2],['small-mobile',375,667,2]] as const;
const checks = views.map(([name,width,height,dpr]) => {
  const previous = PNG.sync.read(readFileSync(`art-reviews/2026-10-23-laundry-scenes/${name}-corrected.png`));
  const current = PNG.sync.read(readFileSync(`${root}/${name}-corrected.png`));
  if(previous.width !== current.width || previous.height !== current.height) throw new Error('Size mismatch');
  const layout = generatedLayout(width,height), geometry = upperCloudGeometry(layout);
  const x = travelPosition(0,width,geometry.width,layout.scale * 0.35,width * 0.65);
  // Conservative pixel cover of source alpha bounds; no assumption about fractional nearest sampling.
  const bounds = [Math.floor(x*dpr), Math.floor(geometry.top*dpr),
    Math.ceil((x+228*geometry.scale)*dpr), Math.ceil(geometry.bottom*dpr)];
  let changed=0,outside=0;
  for(let y=0;y<current.height;y++)for(let px=0;px<current.width;px++) {
    const offset=(y*current.width+px)*4;
    if(!current.data.subarray(offset,offset+4).equals(previous.data.subarray(offset,offset+4))) {
      changed++;
      if(!geometry.visible || px<bounds[0] || px>=bounds[2] || y<bounds[1] || y>=bounds[3]) outside++;
    }
  }
  return {name,visible:geometry.visible,bounds,changed,outside,omittedRgbaUnchanged:geometry.visible?null:changed===0};
});
writeFileSync(`${root}/rgba-checks.json`,JSON.stringify({checks},null,2)+'\n');
if(checks.some(check=>check.outside || check.omittedRgbaUnchanged===false)) throw new Error('Outside upper cloud changes');
console.log(checks);
