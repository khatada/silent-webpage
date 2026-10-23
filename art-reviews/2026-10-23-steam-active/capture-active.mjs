import { chromium } from '@playwright/test';
import { writeFile } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
const root = 'art-reviews/2026-10-23-steam-active/';
const browser = await chromium.launch({ executablePath: '/usr/bin/chromium', args: ['--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const results = [];
try {
  for (const [name, width, height, dpr] of [['desktop',1440,900,1],['portrait-large',900,1600,1],['portrait-boundary',1024,1537,1],['small-mobile',375,667,2]]) {
    const page = await browser.newPage({viewport:{width,height},deviceScaleFactor:dpr,reducedMotion:'no-preference'});
    const errors=[];page.on('pageerror',e=>errors.push(e.message));
    await page.clock.install({time:new Date('2026-10-23T00:00:00Z')});
    await page.clock.pauseAt(new Date('2026-10-23T00:00:01Z'));
    await page.goto('http://127.0.0.1:4173/silent-webpage/');
    await page.waitForSelector('html[data-ready="true"]',{state:'attached'});
    await page.addStyleTag({content:'.settings-open{visibility:hidden!important}'});
    await page.clock.runFor(2000);
    const motion=await page.locator('canvas').getAttribute('data-motion');
    const input=root+name+'-source.png',output=root+name+'-corrected.png';
    await page.locator('canvas').screenshot({path:input});
    await page.close();
    if(errors.length)throw new Error(errors.join('\n'));
    execFileSync(process.execPath,['--import','tsx','scripts/correct-pixel-art.ts','--input',input,'--output',output,'--cell-size',String(dpr),'--scale',String(dpr)],{stdio:'inherit'});
    results.push({name,width,height,dpr,motion,errors,input,output,sourceSha256:createHash('sha256').update(await readFile(input)).digest('hex')});
  }
} finally { await browser.close(); }
await writeFile(root+'capture.json',JSON.stringify({runtimeSourceSha256:'ce9ad8002af4e93680d53835ffaf347dfebd6baac32eef2d54a8b1ccf8794890',method:'Actual built production page; Playwright clock installed and paused before navigation, no-preference motion, runFor(2000ms) after ready. No production API or source modifications.',results,adoption:'PENDING_LLM_VISUAL_REVIEW'},null,2)+'\n',{flag:'wx'});
