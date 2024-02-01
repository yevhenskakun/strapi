import { test, expect } from '@playwright/test';
import { describeOnCondition } from '../../utils/shared';
import { resetDatabaseAndImportDataFromPath } from '../../scripts/dts-import';
import { login } from '../../utils/login';

const edition = process.env.STRAPI_DISABLE_EE === 'true' ? 'CE' : 'EE';
const releaseName = 'Trent Crimm: The Independent';

describeOnCondition(edition === 'EE')('Release page', () => {
  test.beforeEach(async ({ page }) => {
    await resetDatabaseAndImportDataFromPath('./e2e/data/with-admin.tar');
    await page.goto('/admin');
    await login({ page });

    await page.getByRole('link', { name: 'Releases' }).click();
    page.getByRole('link', { name: `${releaseName} 6 entries` }).click();
    await page.waitForURL('/admin/plugins/content-releases/*');
  });

  test('A user should be able to add collection-type entries to a release and publish the release', async ({
    page,
  }) => {
    // Add a collection-type entry to the release
    await page.getByRole('link', { name: 'Content Manager' }).click();
    await page.getByRole('link', { name: 'Author' }).click();
    await page.getByRole('gridcell', { name: 'Led Tasso' }).click();
    await page.waitForURL('**/content-manager/collection-types/api::author.author/**');
    // Open the add to release dialog
    await page.getByRole('button', { name: 'Add to release' }).click();
    await expect(page.getByRole('dialog', { name: 'Add to release' })).toBeVisible();
    // Select a release
    const submitButton = await page.getByRole('button', { name: 'Continue' });
    await expect(submitButton).toBeDisabled();
    await page.getByRole('combobox', { name: 'Select a release' }).click();
    await page.getByRole('option', { name: releaseName }).click();
    await expect(submitButton).toBeEnabled();
    await submitButton.click();
    // See the release the entry was added to
    await expect(
      page.getByRole('complementary', { name: 'Releases' }).getByText(releaseName)
    ).toBeVisible();

    // Publish the release
    await page.getByRole('link', { name: 'Releases' }).click();
    await page.getByRole('link', { name: `${releaseName} 7 entries` }).click();
    await page.getByRole('button', { name: 'Publish' }).click();
    expect(page.getByRole('heading', { name: releaseName })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Publish' })).not.toBeVisible();
    await expect(page.getByRole('button', { name: 'Release actions' })).not.toBeVisible();
    await expect(page.getByRole('gridcell', { name: 'publish unpublish' })).not.toBeVisible();
    await expect(
      page.getByRole('gridcell', { name: 'This entry was published.' }).first()
    ).toBeVisible();
  });

  test('A user should be able to edit and delete a release', async ({ page }) => {
    // Edit the release
    await page.getByRole('button', { name: 'Release actions' }).click();
    await page.getByRole('button', { name: 'Edit' }).click();
    await expect(page.getByRole('dialog', { name: 'Edit release' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Save' })).toBeDisabled();
    await page.getByRole('textbox', { name: 'Name' }).fill('Trent Crimm: Independent');
    await expect(page.getByRole('button', { name: 'Save' })).toBeEnabled();
    await page.getByRole('button', { name: 'Save' }).click();
    const editedEntryName = 'Trent Crimm: Independent';
    await expect(page.getByRole('heading', { name: editedEntryName })).toBeVisible();

    // Delete the release
    await page.getByRole('button', { name: 'Release actions' }).click();
    await page.getByRole('button', { name: 'Delete' }).click();
    await page.getByRole('button', { name: 'Confirm' }).click();
    // Wait for client side redirect to the releases page
    await page.waitForURL('/admin/plugins/content-releases');
    await expect(
      page.getByRole('link', { name: `${editedEntryName} 6 entries` })
    ).not.toBeVisible();
  });

  test("A user should be able to change the entry groupings, update an entry's action, remove an entry from a release, and navigate to the entry in the content manager", async ({
    page,
  }) => {
    // Change the entry groupings
    await expect(page.getByRole('separator', { name: 'Article' })).toBeVisible();
    await expect(page.getByRole('separator', { name: 'Author' })).toBeVisible();
    await page.getByLabel('Group by').click();
    await page.getByRole('option', { name: 'Actions' }).click();
    await expect(page.getByRole('separator', { name: 'publish', exact: true })).toBeVisible();
    await expect(page.getByRole('separator', { name: 'unpublish' })).toBeVisible();

    const row = await page.getByRole('row').filter({ hasText: 'West Ham post match analysis' });
    // Update a given row's action
    await expect(row.getByRole('radio').first()).not.toBeChecked();
    row.locator('label').first().click();
    await expect(row.getByRole('radio').first()).toBeChecked();

    // Navigate to a given row's entry in the content-manager
    await row.getByRole('button', { name: 'Release action options' }).click();
    await page.getByRole('menuitem', { name: 'Edit entry' }).click();
    await page.waitForURL('**/content-manager/collection-types/api::article.article/**');
    await expect(page.getByRole('heading', { name: 'West Ham post match analysis' })).toBeVisible();

    // Return to release page
    await page.goBack();
    await page.waitForURL('/admin/plugins/content-releases/*');

    // Remove a given row's entry from the release
    await row.getByRole('button', { name: 'Release action options' }).click();
    await page.getByRole('menuitem', { name: 'Remove from release' }).click();
    await expect(row).not.toBeVisible();
  });
});
