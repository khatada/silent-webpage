import { mkdir, writeFile } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
import { PNG } from 'pngjs';
import { chromium } from '@playwright/test';
import { generatedLayout } from '../src/generated-layout';
import { meteorGeometry } from '../src/image-meteor';
import { artSourceHash } from './art-source-hash';
const output = 'art-reviews/2026-10-30-visible-meteor-active';
await mkdir(output, { recursive: false });
const sourceSha256 = await artSourceHash();
const results: unknown[] = [];
const correct = (file: string) => execFileSync(process.execPath, ['--import','tsx','scripts/correct-pixel-art.ts','--input',file,'--output',file.replace('-source.png','-corrected.png'),'--cell-size','1','--scale','1']);
for (const [name,width,height] of [['wide',2560,1080],['normal',1440,900],['small',295,844]] as const) {
 const browser = await chromium.launch({executablePath: '/usr/bin/chromium', args: ['--no-sandbox','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
 try {
  const page = await browser.newPage({viewport:{width,height},deviceScaleFactor:1,reducedMotion:'reduce'});
  const errors: string[] = []; page.on('pageerror', e => errors.push(e.message));
  await page.clock.install({time:new Date(0)}); await page.clock.pauseAt(new Date(0));
  await page.goto('http://127.0.0.1:4173/silent-webpage/');
  await page.waitForSelector('html[data-ready="true"]',{state:'attached'});
  await page.addStyleTag({content:'.settings-open{visibility:hidden!important}'});
  await page.emulateMedia({reducedMotion:'no-preference'}); await page.locator('canvas[data-motion="running"]').waitFor({state:'attached'});
  const layout = generatedLayout(width,height); const geometry = meteorGeometry(width,layout.skyBottom);
  const crop = {x:Math.max(0,geometry.x-8),y:Math.max(0,geometry.y-8),width:Math.min(width-Math.max(0,geometry.x-8),Math.ceil(geometry.width+geometry.dx+16)),height:Math.min(height-Math.max(0,geometry.y-8),Math.ceil(geometry.height+geometry.dy+16))};
  const shots:PNG[]=[]; let elapsed=0;
  for(const second of [0,3.5,4,4.5,5.2]) {
   while(elapsed<second*1000){const step=Math.min(1000,second*1000-elapsed);await page.clock.runFor(step);elapsed+=step;}
   const shot=PNG.sync.read(await page.screenshot({animations:'allow',scale:'device',timeout:15000})); if(shot.width!==width||shot.height!==height) throw new Error(`${name} dimensions`); shots.push(shot);
   if(second===4){const path=`${output}/${name}-full-source.png`;await writeFile(path,PNG.sync.write(shot));correct(path);}
  }
  const atlas=new PNG({width:crop.width*5,height:crop.height}); for(const [i,shot] of shots.entries()) PNG.bitblt(shot,atlas,crop.x,crop.y,crop.width,crop.height,i*crop.width,0);
  const file=`${output}/${name}-poses-source.png`;await writeFile(file,PNG.sync.write(atlas));correct(file);
  await page.emulateMedia({reducedMotion:'reduce'});await page.locator('canvas[data-motion="paused"]').waitFor({state:'attached'});const a=PNG.sync.read(await page.screenshot({animations:'allow'}));await page.clock.runFor(2000);const b=PNG.sync.read(await page.screenshot({animations:'allow'})); const pauseExact=a.data.equals(b.data);if(!pauseExact)throw new Error(`${name} pause changed`);
  await page.setViewportSize({width:900,height:700});await page.clock.runFor(500); const resized=await page.locator('canvas').evaluate(el=>({width:(el as HTMLCanvasElement).width,height:(el as HTMLCanvasElement).height}));
  await page.emulateMedia({reducedMotion:'no-preference'});await page.locator('canvas[data-motion="running"]').waitFor({state:'attached'});await page.clock.runFor(500);if(errors.length)throw new Error(errors.join('\n'));
  results.push({name,geometry,crop,times:[0,3.5,4,4.5,5.2],pauseExact,resized,errors});
 } finally { await browser.close(); }
}
if(sourceSha256!==await artSourceHash()) throw new Error('source changed');
await writeFile(`${output}/capture.json`,JSON.stringify({sourceSha256,method:'Production page, DPR1, separately launched browsers, screenshot dimensions asserted, virtual clock paused before navigation and running awaited.',limitations:'Requested time may precede final 20fps RAF. Five samples cannot prove continuous motion or all devices. Pixel context includes clouds and aircraft.',results},null,2)+'\n');
