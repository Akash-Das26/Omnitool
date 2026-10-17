import { expect, test } from '@playwright/test';

test('home shows the index and opens the omnibox with Ctrl+K', async ({ page }) => {
  await page.goto('/');

  await expect(page.getByRole('heading', { level: 1, name: 'Omnitool tools index' })).toBeVisible();
  await expect(page.getByRole('main').getByRole('button', { name: /Find a tool/ })).toBeVisible();
  await expect(page.getByRole('heading', { level: 2, name: 'Colour' })).toBeVisible();

  await page.keyboard.press('Control+K');
  const dialog = page.getByRole('dialog');
  await expect(dialog).toBeVisible();
  await expect(dialog.getByPlaceholder('Search tools or a file type')).toBeFocused();

  await dialog.getByPlaceholder('Search tools or a file type').fill('uuid');
  await dialog.getByRole('option', { name: /UUID Generator/ }).click();

  await expect(page).toHaveURL(/\/tools\/uuid-genny$/);
  await expect(page.getByRole('heading', { level: 1, name: 'UUID Generator' })).toBeVisible();
});

test('omnibox finds a second sample tool and closes on Escape', async ({ page }) => {
  await page.goto('/');
  await page
    .getByRole('main')
    .getByRole('button', { name: /Find a tool/ })
    .click();

  const dialog = page.getByRole('dialog');
  await dialog.getByPlaceholder('Search tools or a file type').fill('qr');
  await dialog.getByRole('option', { name: /QR Generator/ }).click();
  await expect(page).toHaveURL(/\/tools\/qr-genny$/);

  await page.keyboard.press('Control+K');
  await expect(page.getByRole('dialog')).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog')).toBeHidden();
});

test('category filter is applied through validated search params', async ({ page }) => {
  await page.goto('/?category=pdf');

  await expect(page.getByRole('heading', { level: 2, name: 'PDF' })).toBeVisible();
  await expect(page.getByRole('heading', { level: 2, name: 'Colour' })).toHaveCount(0);

  await page.goto('/?category=nonsense');
  await expect(page.getByRole('heading', { level: 2, name: 'Colour' })).toBeVisible();
});
