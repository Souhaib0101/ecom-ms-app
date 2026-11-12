import { expect, test, type Locator, type Page } from '@playwright/test';
import { mockApi } from './mock-api';

const runtimeErrors = new WeakMap<Page, string[]>();
test.beforeEach(({ page }) => {
  const errors: string[] = [];
  runtimeErrors.set(page, errors);
  page.on('pageerror', (error) => errors.push(error.message));
});
test.afterEach(({ page }) => expect(runtimeErrors.get(page)).toEqual([]));

async function selectNamed(select: Locator, name: string) {
  const value = await select.locator('option').filter({ hasText: name }).getAttribute('value');
  await select.selectOption(value!);
}

test('overview uses service data and navigation includes a real 404 page', async ({ page }) => {
  await mockApi(page);
  await page.goto('/');
  await expect(page.locator('.stat').nth(0).locator('strong')).toHaveText('10');
  await expect(page.locator('.stat').nth(1).locator('strong')).toHaveText('3');
  await expect(page.locator('.stat').nth(2).locator('strong')).toHaveText('1');
  await page.getByRole('navigation').getByRole('link', { name: 'Produits' }).click();
  await expect(page).toHaveTitle('Produits · Ecom');
  await page.goto('/page-inconnue');
  await expect(page.getByRole('heading', { name: 'Cette page est introuvable.' })).toBeVisible();
  await page.getByRole('link', { name: 'Retour à l’accueil' }).click();
  await expect(page.getByRole('heading', { name: 'Vue d’ensemble' })).toBeVisible();
});

test('customers can be validated, created, edited and deleted using HAL identifiers', async ({
  page,
}) => {
  await mockApi(page);
  await page.goto('/clients');
  await expect(page.locator('tbody tr')).toHaveCount(8);
  await page.getByRole('button', { name: 'Ajouter le client' }).click();
  await expect(page.getByText('Saisissez une adresse e-mail valide.')).toBeVisible();
  await page.getByLabel('Nom complet').fill('Alice Test');
  await page.getByLabel('Adresse e-mail').fill('alice@example.com');
  await page.getByRole('button', { name: 'Ajouter le client' }).click();
  await expect(page.getByRole('status')).toContainText('Le client a bien été enregistré.');
  await page.getByRole('button', { name: 'Modifier Alice Test', exact: true }).click();
  await page.getByLabel('Nom complet').fill('Alice Modifiée');
  await page.getByRole('button', { name: 'Enregistrer', exact: true }).click();
  await expect(
    page.getByRole('button', { name: 'Supprimer Alice Modifiée', exact: true }),
  ).toBeVisible();
  await page.getByRole('button', { name: 'Supprimer Alice Modifiée', exact: true }).click();
  await page.getByRole('button', { name: 'Confirmer la suppression' }).click();
  await expect(
    page.getByRole('button', { name: 'Supprimer Alice Modifiée', exact: true }),
  ).toHaveCount(0);
});

test('customer pagination requests the next server page', async ({ page }) => {
  await mockApi(page);
  await page.goto('/clients');
  await expect(page.locator('tbody tr')).toHaveCount(8);
  await expect(page.getByRole('button', { name: 'Précédent' })).toBeDisabled();
  await page.getByRole('button', { name: 'Suivant' }).click();
  await expect(page.locator('.pagination')).toContainText('Page 2 sur 2');
  await expect(page.locator('tbody tr')).toHaveCount(2);
  await expect(page.getByRole('button', { name: 'Suivant' })).toBeDisabled();
});

test('products reject invalid prices and quantities and support catalog updates', async ({
  page,
}) => {
  await mockApi(page);
  await page.goto('/produits');
  await expect(page.locator('tbody tr')).toHaveCount(3);
  await page.getByLabel('Nom du produit').fill('Adaptateur');
  await page.getByLabel('Prix unitaire (MAD)').fill('-1');
  await page.getByLabel('Quantité en stock').fill('2.5');
  await page.getByRole('button', { name: 'Ajouter le produit' }).click();
  await expect(page.getByText('Saisissez un prix positif ou nul', { exact: false })).toBeVisible();
  await expect(
    page.getByText('Saisissez un nombre entier positif ou nul', { exact: false }),
  ).toBeVisible();
  await page.getByLabel('Prix unitaire (MAD)').fill('199.99');
  await page.getByLabel('Quantité en stock').fill('12');
  await page.getByRole('button', { name: 'Ajouter le produit' }).click();
  await page.getByRole('button', { name: 'Modifier Adaptateur', exact: true }).click();
  await page.getByLabel('Quantité en stock').fill('0');
  await page.getByRole('button', { name: 'Enregistrer', exact: true }).click();
  await expect(page.getByRole('row').filter({ hasText: 'Adaptateur' })).toContainText('Épuisé');
  await page.getByRole('button', { name: 'Supprimer Adaptateur', exact: true }).click();
  await page.getByRole('button', { name: 'Confirmer la suppression' }).click();
  await expect(page.locator('tbody tr')).toHaveCount(3);
});

test('multi-line invoices validate duplicates and send identifiers and quantities without browser prices', async ({
  page,
}) => {
  await mockApi(page);
  await page.goto('/factures/nouvelle');
  await page.getByRole('button', { name: 'Créer la facture', exact: true }).click();
  await expect(page.getByText('Sélectionnez un client.', { exact: true })).toBeVisible();
  await selectNamed(page.getByLabel('Client à facturer'), 'Mohamed');
  await selectNamed(page.getByLabel('Produit 1', { exact: true }), 'Computer');
  await page.getByRole('button', { name: 'Ajouter une ligne', exact: false }).click();
  await selectNamed(page.getByLabel('Produit 2', { exact: true }), 'Computer');
  await page.getByRole('button', { name: 'Créer la facture', exact: true }).click();
  await expect(page.getByRole('alert')).toContainText(
    'Un produit ne peut apparaître qu’une seule fois.',
  );
  await selectNamed(page.getByLabel('Produit 2', { exact: true }), 'Printer');
  await page.getByLabel('Quantité 2', { exact: true }).fill('2');
  await expect(page.locator('.summary-total')).toHaveText(
    new Intl.NumberFormat('fr', { style: 'currency', currency: 'MAD' }).format(6700),
  );
  const posted = page.waitForRequest(
    (request) =>
      request.url().endsWith('/api/billing-service/api/bills') && request.method() === 'POST',
  );
  await page.getByRole('button', { name: 'Créer la facture', exact: true }).click();
  expect((await posted).postDataJSON()).toEqual({
    customerId: 1,
    items: [
      { productId: 1, quantity: 1 },
      { productId: 2, quantity: 2 },
    ],
  });
  await expect(page).toHaveURL(/\/factures\/2$/);
  await expect(page.getByRole('heading', { name: 'Facture FAC-2' })).toBeVisible();
});

test('invoice filtering and fallback details preserve historical amounts', async ({ page }) => {
  const state = await mockApi(page);
  state.bills.push({ ...state.bills[0], id: 2, customerId: 2, customer: state.customers[1] });
  await page.goto('/factures?client=2');
  await expect(page.locator('tbody tr')).toHaveCount(1);
  await expect(page.locator('tbody')).toContainText('FAC-2');
  await expect(page.getByLabel('Client', { exact: true })).toHaveValue('2');
  await page.getByLabel('Client', { exact: true }).selectOption('');
  await expect(page.locator('tbody tr')).toHaveCount(2);
  await expect(page).toHaveURL(/\/factures$/);
  await page.goBack();
  await expect(page.getByLabel('Client', { exact: true })).toHaveValue('2');
  await expect(page.locator('tbody tr')).toHaveCount(1);
  await expect(page.locator('tbody')).toContainText('FAC-2');
  state.bills[0].customer = { id: 1, name: 'Default customer', email: 'default@gmail.com' };
  state.bills[0].productItems[0].product = null;
  await page.goto('/factures/1');
  await expect(
    page.getByText('Certains détails des clients ou produits', { exact: false }),
  ).toBeVisible();
  await expect(page.locator('.invoice-total')).toContainText(
    new Intl.NumberFormat('fr', { style: 'currency', currency: 'MAD' }).format(9900),
  );
  await page.emulateMedia({ media: 'print' });
  await expect(page.locator('.sidebar')).toBeHidden();
  await expect(page.locator('.invoice')).toBeVisible();
});

test('failed writes retain form values and allow an explicit retry', async ({ page }) => {
  await mockApi(page);
  const failingUrl = '**/api/customer-service/customers';
  await page.route(failingUrl, (route) =>
    route.fulfill({ status: 503, contentType: 'application/json', body: '{}' }),
  );
  await page.goto('/clients');
  await expect(page.locator('tbody tr')).toHaveCount(8);
  await page.getByLabel('Nom complet').fill('Alice Retry');
  await page.getByLabel('Adresse e-mail').fill('retry@example.com');
  await page.getByRole('button', { name: 'Ajouter le client' }).click();
  await expect(page.getByRole('alert')).toContainText('Un service est indisponible.');
  await expect(page.getByLabel('Nom complet')).toHaveValue('Alice Retry');
  await page.unroute(failingUrl);
  await page.getByRole('button', { name: 'Ajouter le client' }).click();
  await expect(
    page.getByRole('button', { name: 'Modifier Alice Retry', exact: true }),
  ).toBeVisible();
});

test('main screens remain usable without horizontal page overflow', async ({ page }) => {
  await mockApi(page);
  for (const path of [
    '/',
    '/clients',
    '/produits',
    '/factures',
    '/factures/nouvelle',
    '/factures/1',
  ]) {
    await page.goto(path);
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
    await expect
      .poll(() => page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth))
      .toBe(true);
  }
});

for (const resource of [
  { path: '/clients', collection: 'customers', endpoint: 'customer-service/customers' },
  { path: '/produits', collection: 'products', endpoint: 'inventory-service/products' },
] as const) {
  test(`${resource.collection} recover when the current server page disappears and a refresh fails`, async ({
    page,
  }) => {
    const state = await mockApi(page);
    if (resource.collection === 'products') {
      state.products.push(
        ...Array.from({ length: 7 }, (_, index) => ({
          id: index + 4,
          name: `Article ${index + 4}`,
          price: 10,
          quantity: 1,
        })),
      );
    }
    await page.goto(resource.path);
    await page.getByRole('button', { name: 'Suivant' }).click();
    await expect(page.locator('.pagination')).toContainText('Page 2 sur 2');
    state[resource.collection].splice(1);
    await page.getByRole('button', { name: 'Actualiser' }).click();
    await expect(page.locator('.pagination')).toContainText('Page 1 sur 1');
    await expect(page.locator('tbody tr')).toHaveCount(1);

    const failingUrl = `**/api/${resource.endpoint}?**`;
    await page.route(failingUrl, (route) => route.fulfill({ status: 503, body: '{}' }));
    await page.getByRole('button', { name: 'Actualiser' }).click();
    await expect(page.getByRole('alert')).toContainText('Un service est indisponible.');
    await expect(page.locator('tbody tr')).toHaveCount(0);
    await page.unroute(failingUrl);
    await page.getByRole('button', { name: 'Actualiser' }).click();
    await expect(page.locator('tbody tr')).toHaveCount(1);
  });
}

test('invoice details can be retried and invalid identifiers never reach the API', async ({
  page,
}) => {
  await mockApi(page);
  const failingUrl = '**/api/billing-service/api/bills/1';
  await page.route(failingUrl, (route) => route.fulfill({ status: 503, body: '{}' }));
  await page.goto('/factures/1');
  await expect(page.getByRole('alert')).toContainText('Un service est indisponible.');
  await page.unroute(failingUrl);
  await page.getByRole('button', { name: 'Réessayer', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Facture FAC-1' })).toBeVisible();

  const invoiceRequests: string[] = [];
  page.on('request', (request) => {
    if (request.url().includes('/api/billing-service/api/bills/'))
      invoiceRequests.push(request.url());
  });
  await page.goto('/factures/invalide');
  await expect(page.getByRole('alert')).toHaveText('Le numéro de facture est invalide.');
  expect(invoiceRequests).toEqual([]);
});

test('invoice deletion supports cancellation and retry after a server failure', async ({
  page,
}) => {
  const state = await mockApi(page);
  await page.goto('/factures/1');
  await page.getByRole('button', { name: 'Supprimer la facture', exact: true }).click();
  await page.getByRole('button', { name: 'Annuler la suppression' }).click();
  await expect(page.getByRole('button', { name: 'Confirmer la suppression' })).toHaveCount(0);
  expect(state.bills).toHaveLength(1);

  const failingUrl = '**/api/billing-service/api/bills/1';
  await page.route(failingUrl, (route) => route.fulfill({ status: 503, body: '{}' }));
  await page.getByRole('button', { name: 'Supprimer la facture', exact: true }).click();
  await page.getByRole('button', { name: 'Confirmer la suppression' }).click();
  await expect(page.getByRole('alert')).toContainText('Un service est indisponible.');
  await expect(page.locator('.invoice')).toBeVisible();
  await page.unroute(failingUrl);
  await page.getByRole('button', { name: 'Confirmer la suppression' }).click();
  await expect(page).toHaveURL(/\/factures$/);
  await expect(page.locator('tbody tr')).toHaveCount(0);
  expect(state.bills).toHaveLength(0);
});

test('invoice selectors load every API page and invalidate deleted selections on refresh', async ({
  page,
}) => {
  const state = await mockApi(page);
  state.customers.push(
    ...Array.from({ length: 101 }, (_, index) => ({
      id: index + 11,
      name: `Z Client ${index}`,
      email: `z${index}@example.com`,
    })),
  );
  state.products.push(
    ...Array.from({ length: 101 }, (_, index) => ({
      id: index + 4,
      name: `Z Produit ${index}`,
      price: 12.5,
      quantity: 10,
    })),
  );
  await page.goto('/factures/nouvelle');
  const customerSelect = page.getByLabel('Client à facturer');
  const productSelect = page.getByLabel('Produit 1', { exact: true });
  await expect(customerSelect.locator('option')).toHaveCount(112);
  await expect(productSelect.locator('option')).toHaveCount(105);
  await selectNamed(customerSelect, 'Z Client 99');
  await selectNamed(productSelect, 'Z Produit 99');
  await page.getByLabel('Quantité 1', { exact: true }).fill('3');
  await expect(page.locator('.summary-total')).toHaveText(
    new Intl.NumberFormat('fr', { style: 'currency', currency: 'MAD' }).format(37.5),
  );

  state.customers = state.customers.filter((customer) => customer.name !== 'Z Client 99');
  state.products = state.products.filter((product) => product.name !== 'Z Produit 99');
  await page.getByRole('button', { name: 'Actualiser les données' }).click();
  await expect(page.getByText('Sélectionnez un client.', { exact: true })).toBeVisible();
  await expect(page.getByText('Sélectionnez un produit.', { exact: true })).toBeVisible();
  await expect(page.getByLabel('Quantité 1', { exact: true })).toHaveValue('3');
  await expect(page.locator('.summary-total')).toHaveText(
    new Intl.NumberFormat('fr', { style: 'currency', currency: 'MAD' }).format(0),
  );
});

test('a failed invoice creation retains its lines and can be retried', async ({ page }) => {
  const state = await mockApi(page);
  await page.goto('/factures/nouvelle');
  await selectNamed(page.getByLabel('Client à facturer'), 'Mohamed');
  await selectNamed(page.getByLabel('Produit 1', { exact: true }), 'Printer');
  await page.getByLabel('Quantité 1', { exact: true }).fill('2');
  const failingUrl = '**/api/billing-service/api/bills';
  await page.route(failingUrl, (route) => route.fulfill({ status: 503, body: '{}' }));
  await page.getByRole('button', { name: 'Créer la facture', exact: true }).click();
  await expect(page.getByRole('alert')).toContainText('Un service est indisponible.');
  await expect(page.getByLabel('Quantité 1', { exact: true })).toHaveValue('2');
  expect(state.bills).toHaveLength(1);
  await page.unroute(failingUrl);
  await page.getByRole('button', { name: 'Créer la facture', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Facture FAC-2' })).toBeVisible();
  expect(state.bills).toHaveLength(2);
});

test('a customer lookup outage preserves the invoice filter and historical references', async ({
  page,
}) => {
  await mockApi(page);
  await page.route('**/api/customer-service/customers?**', (route) =>
    route.fulfill({ status: 503, body: '{}' }),
  );
  await page.goto('/factures?client=1');
  await expect(page.getByRole('alert')).toContainText('Les noms des clients sont indisponibles.');
  await expect(page.getByLabel('Client', { exact: true })).toHaveValue('1');
  await expect(page.locator('tbody')).toContainText('Client #1');
  await page.unroute('**/api/customer-service/customers?**');
  await page.getByRole('button', { name: 'Actualiser', exact: true }).click();
  await expect(page.getByRole('alert')).toHaveCount(0);
  await expect(page.getByLabel('Client', { exact: true })).toHaveValue('1');
  await expect(page.locator('tbody')).toContainText('Mohamed');
  await page.getByRole('link', { name: 'Voir la facture FAC-1', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Facture FAC-1' })).toBeVisible();
});
