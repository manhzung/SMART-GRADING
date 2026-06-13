import { test, expect } from '@playwright/test';
import path from 'path';

test('teacher can scan a submission end-to-end', async ({ page }) => {
  await page.goto('/login');
  await page.getByLabel(/email/i).fill('teacher@school.test');
  await page.getByLabel(/password/i).fill('password1');
  await page.getByRole('button', { name: /sign in/i }).click();
  await page.waitForURL(/\/dashboard/);

  await page.goto('/submissions');
  await page.getByTestId('scan-button').click();

  const filePath = path.join(__dirname, 'fixtures', 'sample-exam.jpg');
  await page.setInputFiles('[data-testid=file-input]', filePath);

  await expect(page.getByTestId('upload-progress')).toBeVisible();
  await expect(page.getByTestId('scan-complete')).toBeVisible({ timeout: 30_000 });
  await expect(page.getByTestId('submission-score')).toBeVisible();
});
