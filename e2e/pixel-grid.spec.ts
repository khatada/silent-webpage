import { expect, test } from '@playwright/test';

test('the scene covers the viewport with equal integer physical pixel scales after resizing', async ({ page }) => {
  await page.goto('./');
  await expect(page.locator('html')).toHaveAttribute('data-ready', 'true');
  for (const size of [{ width: 801, height: 601 }, { width: 390, height: 844 }]) {
    await page.setViewportSize(size);
    await expect.poll(async () => page.locator('canvas').evaluate(canvas => {
      if (!(canvas instanceof HTMLCanvasElement)) return false;
      const rect = canvas.getBoundingClientRect();
      const x = rect.width * devicePixelRatio / canvas.width;
      const y = rect.height * devicePixelRatio / canvas.height;
      return Math.abs(x - Math.round(x)) < 0.001 && Math.abs(x - y) < 0.001
        && rect.width >= innerWidth && rect.height >= innerHeight
        && rect.width - innerWidth < x / devicePixelRatio + 0.01
        && rect.height - innerHeight < y / devicePixelRatio + 0.01;
    })).toBe(true);
  }
});
