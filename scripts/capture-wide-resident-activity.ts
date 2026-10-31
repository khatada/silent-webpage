import { mkdir, writeFile } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
import { PNG } from 'pngjs';
import { chromium } from '@playwright/test';
import { generatedLayout } from '../src/generated-layout';
import { residentialLightCycle } from '../src/city-motion';
import { windowBrightness } from '../src/animation';
import { residentFrame } from '../src/resident-timing';
import { artSourceHash } from './art-source-hash';
const output='art-reviews/2026-10-31-wide-resident-active'; await mkdir(output,{recursive:false});
const sourceSha256=await artSourceHash(); const results: unknown[]=[];
const correct=(f:string)=>execFileSync(process.execPath,['--import','tsx','scripts/correct-pixel-art.ts','--input',f,'--output',f.replace('-source.png','-corrected.png'),'--cell-size','1','--scale','1']);
for(const [name,width,height] of [['wide',2560,1080],['compact',800,600],['landscape',844,390]] as const){
 const browser=await chromium.launch({executablePath:process.env.ART_BROWSER_PATH||'/usr/bin/chromium',args:['--no-sandbox','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
 try{
  const page=await browser.newPage({viewport:{width,height},deviceScaleFactor:1,reducedMotion:'reduce'}); const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
  await page.clock.install({time:new Date(0)});await page.clock.pauseAt(new Date(0));await page.goto('http://127.0.0.1:4173/silent-webpage/');await page.waitForSelector('html[data-ready="true"]',{state:'attached'});await page.addStyleTag({content:'.settings-open{visibility:hidden!important}'});await page.emulateMedia({reducedMotion:'no-preference'});await page.locator('canvas[data-motion="running"]').waitFor({state:'attached'});
  const layout=generatedLayout(width,height);if(!layout.wide||layout.scale<2)throw new Error('unexpected layout');const sc=layout.scale;
  const crop={x:Math.floor(layout.originX+248*sc),y:Math.floor(layout.originY+164*sc),width:18*sc,height:17*sc};if(crop.x<0||crop.y<0||crop.x+crop.width>width||crop.y+crop.height>height)throw new Error('crop outside');
  const times=[0,0.5,6.5,8.95,9.4,10.5];const shots:PNG[]=[];let elapsed=0;
  for(const t of times){while(elapsed<t*1000){const dt=Math.min(1000,t*1000-elapsed);await page.clock.runFor(dt);elapsed+=dt;} const shot=PNG.sync.read(await page.screenshot({animations:'allow',scale:'device',timeout:15000}));if(shot.width!==width||shot.height!==height)throw new Error('unexpected dimensions');shots.push(shot);if(t===9.4){const f=`${output}/${name}-full-source.png`;await writeFile(f,PNG.sync.write(shot));correct(f);}}
  const atlas=new PNG({width:crop.width*3,height:crop.height*2});for(const [i,shot] of shots.entries())PNG.bitblt(shot,atlas,crop.x,crop.y,crop.width,crop.height,i%3*crop.width,Math.floor(i/3)*crop.height);
  const f=`${output}/${name}-poses-source.png`;await writeFile(f,PNG.sync.write(atlas));correct(f);
  await page.emulateMedia({reducedMotion:'reduce'});await page.locator('canvas[data-motion="paused"]').waitFor({state:'attached'});const a=PNG.sync.read(await page.screenshot({animations:'allow'}));await page.clock.runFor(2000);const b=PNG.sync.read(await page.screenshot({animations:'allow'}));const pauseExact=a.data.equals(b.data);if(!pauseExact)throw new Error('pause changed');await page.setViewportSize({width:900,height:700});await page.clock.runFor(500);const resized=await page.locator('canvas').evaluate(e=>({width:(e as HTMLCanvasElement).width,height:(e as HTMLCanvasElement).height}));await page.emulateMedia({reducedMotion:'no-preference'});await page.locator('canvas[data-motion="running"]').waitFor({state:'attached'});await page.clock.runFor(500);if(errors.length)throw new Error(errors.join('\n'));
  const cycle=residentialLightCycle(6);results.push({name,viewport:[width,height],scale:sc,crop,times,calculated:times.map(t=>({t,brightness:windowBrightness(t,cycle.phase,cycle.period),frame:residentFrame(t,3)})),pauseExact,resized,errors});
 }finally{await browser.close();}
}
if(sourceSha256!==await artSourceHash())throw new Error('source changed');await writeFile(`${output}/capture.json`,JSON.stringify({sourceSha256,method:'Production page; DPR1; separate Chromium; screenshot dimensions asserted; running awaited; context crops 1:1.',limitations:'Requested time and calculated brightness/frame are not measured actual RAF; final 20fps frame can precede request. Six still times do not prove continuous motion. Resize dimensions checked only.',results},null,2)+'\n');
