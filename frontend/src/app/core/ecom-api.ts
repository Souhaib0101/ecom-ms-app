import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Injectable, InjectionToken } from '@angular/core';
import { EMPTY, expand, map, Observable, reduce } from 'rxjs';
import {
  Bill,
  BillSummary,
  CreateBill,
  Customer,
  CustomerInput,
  Page,
  PageInfo,
  Product,
  ProductInput,
} from './models';

export const API_BASE_URL = new InjectionToken<string>('API_BASE_URL', { factory: () => '/api' });

interface HalEntity {
  _links: { self: { href: string } };
}

interface HalPage<T> {
  _embedded?: Record<string, (T & HalEntity)[]>;
  page: PageInfo;
}

@Injectable({ providedIn: 'root' })
export class EcomApi {
  private readonly http = inject(HttpClient);
  private readonly base = inject(API_BASE_URL).replace(/\/$/, '');
  private readonly customersUrl = `${this.base}/customer-service/customers`;
  private readonly productsUrl = `${this.base}/inventory-service/products`;
  private readonly billsUrl = `${this.base}/billing-service/api/bills`;

  customers(page = 0, size = 8): Observable<Page<Customer>> {
    return this.page<Customer>(this.customersUrl, 'customers', page, size);
  }

  allCustomers(): Observable<Customer[]> {
    return this.allPages((page) => this.customers(page, 100));
  }

  saveCustomer(value: CustomerInput, id?: number): Observable<unknown> {
    return id === undefined
      ? this.http.post(this.customersUrl, value)
      : this.http.patch(`${this.customersUrl}/${id}`, value);
  }

  deleteCustomer(id: number): Observable<void> {
    return this.http.delete<void>(`${this.customersUrl}/${id}`);
  }

  products(page = 0, size = 8): Observable<Page<Product>> {
    return this.page<Product>(this.productsUrl, 'products', page, size);
  }

  allProducts(): Observable<Product[]> {
    return this.allPages((page) => this.products(page, 100));
  }

  saveProduct(value: ProductInput, id?: number): Observable<unknown> {
    return id === undefined
      ? this.http.post(this.productsUrl, value)
      : this.http.patch(`${this.productsUrl}/${id}`, value);
  }

  deleteProduct(id: number): Observable<void> {
    return this.http.delete<void>(`${this.productsUrl}/${id}`);
  }

  bills(customerId?: number): Observable<BillSummary[]> {
    const params =
      customerId === undefined ? new HttpParams() : new HttpParams().set('customerId', customerId);
    return this.http.get<BillSummary[]>(this.billsUrl, { params });
  }

  bill(id: number): Observable<Bill> {
    return this.http.get<Bill>(`${this.billsUrl}/${id}`);
  }

  createBill(value: CreateBill): Observable<Bill> {
    return this.http.post<Bill>(this.billsUrl, value);
  }

  deleteBill(id: number): Observable<void> {
    return this.http.delete<void>(`${this.billsUrl}/${id}`);
  }

  private page<T extends { id: number }>(
    url: string,
    collection: string,
    page: number,
    size: number,
  ): Observable<Page<T>> {
    const params = new HttpParams().set('page', page).set('size', size).set('sort', 'name,asc');
    return this.http.get<HalPage<T>>(url, { params }).pipe(
      map((response) => ({
        ...response.page,
        items: (response._embedded?.[collection] ?? []).map((resource) => {
          // Spring Data REST hides JPA identifiers; use the numeric identifier from its self link.
          const identifier =
            resource.id ??
            Number(
              new URL(resource._links.self.href, 'http://localhost').pathname.match(
                /\/(\d+)\/?$/,
              )?.[1],
            );
          if (!Number.isSafeInteger(identifier) || identifier <= 0) {
            throw new Error('Identifiant de ressource invalide.');
          }
          return { ...resource, id: identifier };
        }),
      })),
    );
  }

  private allPages<T>(load: (page: number) => Observable<Page<T>>): Observable<T[]> {
    return load(0).pipe(
      expand((page) => (page.number + 1 < page.totalPages ? load(page.number + 1) : EMPTY)),
      reduce((items, page) => [...items, ...page.items], [] as T[]),
    );
  }
}
