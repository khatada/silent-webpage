import { expect, test } from '@playwright/test';

test('fullscreen is optional and the user can enter and leave it', async ({ page }) => {
  await page.goto('./');
  const supported = await page.evaluate(() => Boolean(document.fullscreenEnabled && document.documentElement.requestFullscreen));
  await page.getByRole('button', { name: '設定を開く' }).click();
  const section = page.locator('#fullscreen-setting');
  if (!supported) {
    await expect(section).toBeHidden();
    await expect(page.locator('canvas')).toBeVisible();
    return;
  }
  await expect.poll(() => page.evaluate(() => document.fullscreenElement === null)).toBe(true);
  await page.getByRole('button', { name: '全画面で眺める' }).click();
  await expect.poll(() => page.evaluate(() => Boolean(document.fullscreenElement))).toBe(true);
  await expect(page.getByRole('dialog')).toBeHidden();
  await expect(page.getByRole('button', { name: '設定を開く' })).toBeFocused();
  await page.evaluate(() => document.exitFullscreen());
  await page.getByRole('button', { name: '設定を開く' }).click();
  await expect(page.getByRole('button', { name: '全画面で眺める' })).toBeVisible();
  await page.getByRole('button', { name: '全画面で眺める' }).click();
  await page.getByRole('button', { name: '設定を開く' }).click();
  await page.getByRole('button', { name: '全画面を終了' }).click();
  await expect.poll(() => page.evaluate(() => document.fullscreenElement === null)).toBe(true);
  await expect(page.getByRole('dialog')).toBeHidden();
});

test('unsupported fullscreen does not add an unusable control', async ({ page }) => {
  await page.addInitScript(() => Object.defineProperty(document, 'fullscreenEnabled', { value: false }));
  await page.goto('./');
  await page.getByRole('button', { name: '設定を開く' }).click();
  await expect(page.locator('#fullscreen-setting')).toBeHidden();
  await expect(page.getByRole('radio', { name: '無音', exact: true })).toBeChecked();
});

test('a rejected fullscreen request keeps settings usable and allows retry', async ({ page }) => {
  await page.addInitScript(() => {
    Object.defineProperty(document, 'fullscreenEnabled', { value: true });
    Object.defineProperty(HTMLElement.prototype, 'requestFullscreen', {
      value: () => Promise.reject(new Error('Request denied')),
    });
  });
  await page.goto('./');
  await page.getByRole('button', { name: '設定を開く' }).click();
  const button = page.getByRole('button', { name: '全画面で眺める' });
  await button.click();
  await expect(page.locator('#fullscreen-status')).toHaveText('全画面に切り替えられませんでした。もう一度お試しください。');
  await expect(button).toBeEnabled();
  await expect(page.getByRole('dialog')).toBeVisible();
  await page.getByRole('button', { name: '設定を閉じる' }).click();
  await expect(page.getByRole('dialog')).toBeHidden();
});
