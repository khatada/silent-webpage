import './style.css';
import { createScene } from './scene';
import { Soundscape, type SoundMode } from './audio';
import { parsePreferences } from './preferences';
import { setupFullscreen } from './fullscreen';

const storageKey = 'tokyo-after-hours:preferences';
let stored: string | null = null;
try { stored = localStorage.getItem(storageKey); } catch { /* Storage may be unavailable. */ }
const preferences = parsePreferences(stored);
const systemMotion = matchMedia('(prefers-reduced-motion: reduce)');
const dialog = document.querySelector<HTMLDialogElement>('#settings')!;
const opener = document.querySelector<HTMLButtonElement>('#settings-open')!;
const disposeFullscreen = setupFullscreen(dialog, opener);
const volume = document.querySelector<HTMLInputElement>('#volume')!;
const motion = document.querySelector<HTMLInputElement>('#reduce-motion')!;
const motionDescription = document.querySelector<HTMLElement>('#motion-description')!;
const status = document.querySelector<HTMLParagraphElement>('#status')!;
const audio = new Soundscape();
let desiredSound: SoundMode = 'off';
let scene: Awaited<ReturnType<typeof createScene>> | undefined;
function save() {
  try { localStorage.setItem(storageKey, JSON.stringify(preferences)); } catch { /* Settings still work without storage. */ }
}
function updateMotion() {
  motion.checked = preferences.reduceMotion || systemMotion.matches;
  motion.disabled = systemMotion.matches;
  motionDescription.textContent = systemMotion.matches
    ? '端末の設定に合わせて動きを抑えています'
    : '星や雲、街の動きを静かにします';
  scene?.setMotion(!motion.checked);
}
volume.value = String(Math.round(preferences.volume * 100));
updateMotion();
audio.setVolume(preferences.volume);
const volumeOutput = document.querySelector<HTMLOutputElement>('#volume-value')!;
volumeOutput.value = `${volume.value}%`;
volume.addEventListener('input', () => {
  preferences.volume = Number(volume.value) / 100;
  volumeOutput.value = `${volume.value}%`;
  audio.setVolume(preferences.volume);
  save();
});
motion.addEventListener('change', () => { preferences.reduceMotion = motion.checked; updateMotion(); save(); });
systemMotion.addEventListener('change', updateMotion);
opener.addEventListener('click', () => dialog.showModal());
document.querySelector('#settings-close')!.addEventListener('click', () => dialog.close());
dialog.addEventListener('close', () => opener.focus());
dialog.addEventListener('click', event => { if (event.target === dialog) {
  const rect = dialog.getBoundingClientRect();
  if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) dialog.close();
} });
function notify(message: string) { status.textContent = message; status.hidden = false; }
document.querySelectorAll<HTMLInputElement>('input[name="sound"]').forEach(input => {
  input.addEventListener('change', () => {
    desiredSound = input.value as SoundMode;
    void audio.setMode(desiredSound).then(() => { status.hidden = true; }).catch(() => {
      desiredSound = 'off';
      document.querySelector<HTMLInputElement>('input[value="off"]')!.checked = true;
      notify('音を再生できませんでした。もう一度お試しください。');
    });
  });
});
document.addEventListener('visibilitychange', () => {
  const operation = document.hidden ? audio.suspend() : desiredSound !== 'off' ? audio.resume() : Promise.resolve();
  void operation.catch(() => notify('音を再開するには、音の風景を選び直してください。'));
});
void createScene(document.querySelector<HTMLElement>('#scene')!).then(value => {
  scene = value;
  updateMotion();
  status.hidden = true;
  document.documentElement.dataset.ready = 'true';
}).catch(() => notify('夜景を表示できませんでした。ページを再読み込みしてください。'));
window.addEventListener('pagehide', event => { if (!event.persisted) { scene?.destroy(); audio.destroy(); disposeFullscreen(); } });
