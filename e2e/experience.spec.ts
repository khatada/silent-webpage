import { expect, test } from '@playwright/test';

test('night scene loads without runtime errors and settings fit the screen', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));

  await page.goto('./');
  await expect(page.locator('html')).toHaveAttribute('data-ready', 'true');
  await expect(page).toHaveTitle('TOKYO AFTER HOURS');
  const canvas = page.locator('canvas');
  await expect(canvas).toBeVisible();
  const sceneBox = await canvas.boundingBox();
  expect(sceneBox?.width).toBeGreaterThan(100);
  expect(sceneBox?.height).toBeGreaterThan(100);

  const openSettings = page.getByRole('button', { name: '設定を開く' });
  await openSettings.click();
  const dialog = page.getByRole('dialog');
  await expect(dialog).toBeVisible();
  await expect(page.getByRole('radio', { name: '無音', exact: true })).toBeChecked();
  const bounds = await dialog.boundingBox();
  const viewport = page.viewportSize();
  expect(bounds).not.toBeNull();
  expect(viewport).not.toBeNull();
  if (bounds && viewport) {
    expect(bounds.x).toBeGreaterThanOrEqual(0);
    expect(bounds.y).toBeGreaterThanOrEqual(0);
    expect(bounds.x + bounds.width).toBeLessThanOrEqual(viewport.width + 1);
    expect(bounds.y + bounds.height).toBeLessThanOrEqual(viewport.height + 1);
  }

  await page.getByRole('radio', { name: '街の音', exact: true }).check();
  await expect(page.getByRole('radio', { name: '街の音', exact: true })).toBeChecked();
  await page.getByRole('radio', { name: 'アンビエント', exact: true }).check();
  await expect(page.getByRole('radio', { name: 'アンビエント', exact: true })).toBeChecked();
  await page.getByRole('radio', { name: '無音', exact: true }).check();
  await expect(page.getByLabel('音量', { exact: true })).toBeVisible();
  await page.getByRole('checkbox', { name: '動きを減らす' }).check();
  await expect(page.getByRole('checkbox', { name: '動きを減らす' })).toBeChecked();

  await page.getByRole('button', { name: '設定を閉じる' }).click();
  await expect(dialog).not.toBeVisible();
  await expect(openSettings).toBeFocused();
  expect(errors).toEqual([]);
});

test('OS reduced motion is respected and settings work with the keyboard', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('./');
  const openSettings = page.getByRole('button', { name: '設定を開く' });
  await openSettings.focus();
  await page.keyboard.press('Enter');
  await expect(page.getByRole('dialog')).toBeVisible();
  await expect(page.getByRole('checkbox', { name: '動きを減らす' })).toBeChecked();
  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog')).not.toBeVisible();
  await expect(openSettings).toBeFocused();
});
