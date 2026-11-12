import type { Page, Route } from '@playwright/test';
import type { Bill, CreateBill, Customer, Product } from '../src/app/core/models';

export async function mockApi(page: Page) {
  const customers: Customer[] = [
    { id: 1, name: 'Mohamed', email: 'mohamed@example.com' },
    ...Array.from({ length: 9 }, (_, index) => ({
      id: index + 2,
      name: `Client ${index + 2}`,
      email: `client${index + 2}@example.com`,
    })),
  ];
  const products: Product[] = [
    { id: 1, name: 'Computer', price: 4300, quantity: 50 },
    { id: 2, name: 'Printer', price: 1200, quantity: 10 },
    { id: 3, name: 'Smartphone', price: 3200, quantity: 0 },
  ];
  const state = { customers, products, bills: [] as Bill[] };

  function invoice(id: number, value: CreateBill): Bill {
    const productItems = value.items.map((item, index) => {
      const product = state.products.find((product) => product.id === item.productId)!;
      return {
        id: index + 1,
        ...item,
        unitPrice: product.price,
        amount: product.price * item.quantity,
        product,
      };
    });
    return {
      id,
      billingDate: '2026-11-12',
      customerId: value.customerId,
      customer: state.customers.find((customer) => customer.id === value.customerId)!,
      productItems,
      total: productItems.reduce((sum, item) => sum + item.amount, 0),
    };
  }
  state.bills.push(
    invoice(1, {
      customerId: 1,
      items: [
        { productId: 1, quantity: 1 },
        { productId: 2, quantity: 2 },
        { productId: 3, quantity: 1 },
      ],
    }),
  );

  await page.route('**/api/**', async (route) => {
    const request = route.request();
    const url = new URL(request.url());
    const path = url.pathname.replace(/^\/api/, '');
    const method = request.method();
    const resource = path.match(
      /^\/(customer-service\/customers|inventory-service\/products)(?:\/(\d+))?$/,
    );
    if (resource) {
      const isCustomer = resource[1].startsWith('customer');
      const collection = isCustomer ? 'customers' : 'products';
      const items = isCustomer ? state.customers : state.products;
      const id = Number(resource[2]);
      if (method === 'GET') {
        const index = Number(url.searchParams.get('page') ?? 0);
        const size = Number(url.searchParams.get('size') ?? 8);
        const sorted = [...items].sort((a, b) => a.name.localeCompare(b.name));
        return json(route, {
          _embedded: { [collection]: sorted.slice(index * size, (index + 1) * size).map(hal) },
          page: {
            size,
            totalElements: items.length,
            totalPages: Math.ceil(items.length / size),
            number: index,
          },
        });
      }
      if (method === 'POST') {
        const created = {
          ...request.postDataJSON(),
          id: Math.max(0, ...items.map((item) => item.id)) + 1,
        };
        if (isCustomer) state.customers.push(created as Customer);
        else state.products.push(created as Product);
        return json(route, hal(created), 201);
      }
      if (method === 'PATCH') {
        const item = items.find((item) => item.id === id);
        if (!item) return json(route, {}, 404);
        Object.assign(item, request.postDataJSON());
        return json(route, hal(item));
      }
      if (method === 'DELETE') {
        if (isCustomer) state.customers = state.customers.filter((item) => item.id !== id);
        else state.products = state.products.filter((item) => item.id !== id);
        return route.fulfill({ status: 204 });
      }
    }
    if (path === '/billing-service/api/bills') {
      if (method === 'POST') {
        const created = invoice(
          Math.max(0, ...state.bills.map((bill) => bill.id)) + 1,
          request.postDataJSON(),
        );
        state.bills.push(created);
        return json(route, created, 201);
      }
      const customerId = Number(url.searchParams.get('customerId'));
      return json(
        route,
        state.bills
          .filter((bill) => !customerId || bill.customerId === customerId)
          .map((bill) => ({
            id: bill.id,
            billingDate: bill.billingDate,
            customerId: bill.customerId,
            itemCount: bill.productItems.length,
            total: bill.total,
          })),
      );
    }
    const billId = Number(path.match(/^\/billing-service\/api\/bills\/(\d+)$/)?.[1]);
    if (billId) {
      if (method === 'DELETE') {
        state.bills = state.bills.filter((bill) => bill.id !== billId);
        return route.fulfill({ status: 204 });
      }
      const bill = state.bills.find((bill) => bill.id === billId);
      return json(route, bill ?? {}, bill ? 200 : 404);
    }
    return json(route, {}, 404);
  });
  return state;
}

function hal<T extends { id: number }>(resource: T) {
  const { id, ...fields } = resource;
  return { ...fields, _links: { self: { href: `http://internal-service/resources/${id}` } } };
}

function json(route: Route, value: unknown, status = 200) {
  return route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(value) });
}
