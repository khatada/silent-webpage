/** Fullscreen remains an explicit choice; unsupported browsers keep the usual scene. */
export function setupFullscreen(dialog: HTMLDialogElement, opener: HTMLButtonElement): () => void {
  const section = document.querySelector<HTMLElement>('#fullscreen-setting')!;
  const button = document.querySelector<HTMLButtonElement>('#fullscreen-toggle')!;
  const message = document.querySelector<HTMLElement>('#fullscreen-status')!;
  const supported = Boolean(document.fullscreenEnabled && document.documentElement.requestFullscreen);
  section.hidden = !supported;
  if (!supported) return () => {};

  function update() {
    const active = Boolean(document.fullscreenElement);
    button.textContent = active ? '全画面を終了' : '全画面で眺める';
    button.setAttribute('aria-pressed', String(active));
  }
  async function toggle() {
    button.disabled = true;
    message.hidden = true;
    try {
      if (document.fullscreenElement) await document.exitFullscreen();
      else await document.documentElement.requestFullscreen();
      dialog.close();
      opener.focus();
    } catch {
      message.textContent = '全画面に切り替えられませんでした。もう一度お試しください。';
      message.hidden = false;
    } finally {
      button.disabled = false;
      update();
    }
  }
  const onClick = () => { void toggle(); };
  button.addEventListener('click', onClick);
  document.addEventListener('fullscreenchange', update);
  update();
  return () => {
    button.removeEventListener('click', onClick);
    document.removeEventListener('fullscreenchange', update);
  };
}
