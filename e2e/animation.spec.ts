import { expect, test } from '@playwright/test';

test('the living city stops completely when motion is reduced and resumes on request', async ({ page }) => {
  await page.goto('./');
  await expect(page.locator('html')).toHaveAttribute('data-ready', 'true');
  const canvas = page.locator('canvas');
  await expect(canvas).toHaveAttribute('data-motion', 'running');
  await page.getByRole('button', { name: '設定を開く' }).click();
  await page.getByRole('checkbox', { name: '動きを減らす' }).check();
  await expect(canvas).toHaveAttribute('data-motion', 'paused');
  await page.getByRole('button', { name: '設定を閉じる' }).click();
  const still = await canvas.screenshot();
  // Cross several 20fps frames: every actor must remain frozen, not just clouds.
  await page.waitForTimeout(350);
  expect((await canvas.screenshot()).equals(still)).toBe(true);
  await page.getByRole('button', { name: '設定を開く' }).click();
  await page.getByRole('checkbox', { name: '動きを減らす' }).uncheck();
  await page.getByRole('button', { name: '設定を閉じる' }).click();
  await expect(canvas).toHaveAttribute('data-motion', 'running');
  await expect.poll(async () => !(await canvas.screenshot()).equals(still)).toBe(true);
});

test('OS motion changes update the controls without overwriting the personal preference', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await page.goto('./');
  await expect(page.locator('html')).toHaveAttribute('data-ready', 'true');
  await page.getByRole('button', { name: '設定を開く' }).click();
  const control = page.getByRole('checkbox', { name: '動きを減らす' });
  await expect(control).not.toBeChecked();
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await expect(control).toBeChecked();
  await expect(control).toBeDisabled();
  await expect(page.locator('#motion-description')).toHaveText('端末の設定に合わせて動きを抑えています');
  await expect(page.locator('canvas')).toHaveAttribute('data-motion', 'paused');
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await expect(control).not.toBeChecked();
  await expect(control).toBeEnabled();
  await control.check();
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await expect(control).toBeChecked();
  await expect(control).toBeEnabled();
  await page.reload();
  await expect(page.locator('html')).toHaveAttribute('data-ready', 'true');
  await expect(page.locator('canvas')).toHaveAttribute('data-motion', 'paused');
});
