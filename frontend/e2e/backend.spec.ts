import { expect, test } from '@playwright/test';

test('real gateway supports customer, product and invoice workflows through the Angular proxy', async ({
  page,
  request,
}) => {
  const suffix = Date.now();
  const customerName = `Angular ${suffix}`;
  const productName = `Article Angular ${suffix}`;
  let customerId: number | undefined;
  let productId: number | undefined;
  let billId: number | undefined;
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  try {
    for (const endpoint of [
      '/api/customer-service/customers?size=1',
      '/api/inventory-service/products?size=1',
      '/api/billing-service/api/bills',
    ]) {
      await expect
        .poll(async () => (await request.get(endpoint, { timeout: 15_000 })).status(), {
          timeout: 30_000,
          message: `La gateway doit répondre via le proxy Angular : ${endpoint}`,
        })
        .toBe(200);
    }
    await page.goto('/');
    await expect(page.locator('.stat').nth(0).locator('strong')).toHaveText(/^\d+$/);
    await page.screenshot({ path: test.info().outputPath('overview.png'), fullPage: true });
    await page.goto('/clients');
    await expect(page.getByRole('button', { name: 'Ajouter le client' })).toBeEnabled();
    await page.getByLabel('Nom complet').fill(customerName);
    await page.getByLabel('Adresse e-mail').fill(`angular${suffix}@example.com`);
    const customerResponse = page.waitForResponse(
      (response) =>
        response.url().endsWith('/api/customer-service/customers') &&
        response.request().method() === 'POST',
    );
    await page.getByRole('button', { name: 'Ajouter le client' }).click();
    const createdCustomer = await customerResponse;
    expect(createdCustomer.ok()).toBe(true);
    customerId = Number((await createdCustomer.json())._links.self.href.match(/\/(\d+)$/)[1]);
    await expect(page.getByRole('status')).toContainText('Le client a bien été enregistré.');

    await page.getByRole('navigation').getByRole('link', { name: 'Produits' }).click();
    await page.getByLabel('Nom du produit').fill(productName);
    await page.getByLabel('Prix unitaire (MAD)').fill('125.50');
    await page.getByLabel('Quantité en stock').fill('10');
    const productResponse = page.waitForResponse(
      (response) =>
        response.url().endsWith('/api/inventory-service/products') &&
        response.request().method() === 'POST',
    );
    await page.getByRole('button', { name: 'Ajouter le produit' }).click();
    const createdProduct = await productResponse;
    expect(createdProduct.ok()).toBe(true);
    productId = Number((await createdProduct.json())._links.self.href.match(/\/(\d+)$/)[1]);

    await page.getByRole('navigation').getByRole('link', { name: 'Factures' }).click();
    await page.getByRole('link', { name: 'Nouvelle facture', exact: false }).click();
    const customerSelect = page.getByLabel('Client à facturer');
    await customerSelect.selectOption(
      (await customerSelect
        .locator('option')
        .filter({ hasText: customerName })
        .getAttribute('value'))!,
    );
    const productSelect = page.getByLabel('Produit 1', { exact: true });
    await productSelect.selectOption(
      (await productSelect
        .locator('option')
        .filter({ hasText: productName })
        .getAttribute('value'))!,
    );
    await page.getByLabel('Quantité 1', { exact: true }).fill('2');
    const billResponse = page.waitForResponse(
      (response) =>
        response.url().endsWith('/api/billing-service/api/bills') &&
        response.request().method() === 'POST',
    );
    await page.getByRole('button', { name: 'Créer la facture', exact: true }).click();
    const createdBill = await billResponse;
    expect(createdBill.ok()).toBe(true);
    const invoice = await createdBill.json();
    billId = invoice.id;
    expect(invoice.total).toBe(251);
    await expect(page.getByRole('heading', { name: `Facture FAC-${billId}` })).toBeVisible();
    await expect(page.locator('.invoice-customer')).toContainText(customerName);
    await expect(page.locator('.invoice')).toContainText(productName);
    await page.screenshot({ path: test.info().outputPath('invoice.png'), fullPage: true });
    await page.getByRole('button', { name: 'Supprimer la facture', exact: true }).click();
    await page.getByRole('button', { name: 'Confirmer la suppression' }).click();
    await expect(page).toHaveURL(/\/factures$/);
    billId = undefined;
    expect(errors).toEqual([]);
  } finally {
    if (billId) await request.delete(`/api/billing-service/api/bills/${billId}`);
    if (productId) await request.delete(`/api/inventory-service/products/${productId}`);
    if (customerId) await request.delete(`/api/customer-service/customers/${customerId}`);
  }
});
