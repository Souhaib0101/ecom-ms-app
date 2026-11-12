import { CurrencyPipe, DatePipe } from '@angular/common';
import { Component, DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import { finalize, forkJoin } from 'rxjs';
import { apiError } from '../../core/api-error';
import { EcomApi } from '../../core/ecom-api';
import { BillSummary } from '../../core/models';
import { Feedback } from '../../shared/feedback';

@Component({
  imports: [CurrencyPipe, DatePipe, RouterLink, Feedback],
  templateUrl: './overview.html',
  styleUrl: './overview.css',
})
export class Overview {
  private readonly api = inject(EcomApi);
  private readonly destroyRef = inject(DestroyRef);
  readonly stats = signal<{
    customers: number;
    products: number;
    bills: number;
    total: number;
  } | null>(null);
  readonly latest = signal<BillSummary[]>([]);
  readonly loading = signal(false);
  readonly error = signal('');
  readonly updated = signal<Date | null>(null);

  constructor() {
    this.load();
  }

  load(): void {
    this.loading.set(true);
    this.error.set('');
    forkJoin({
      customers: this.api.customers(0, 1),
      products: this.api.products(0, 1),
      bills: this.api.bills(),
    })
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.loading.set(false)),
      )
      .subscribe({
        next: ({ customers, products, bills }) => {
          this.stats.set({
            customers: customers.totalElements,
            products: products.totalElements,
            bills: bills.length,
            total: bills.reduce((sum, bill) => sum + bill.total, 0),
          });
          this.latest.set([...bills].sort((a, b) => b.id - a.id).slice(0, 5));
          this.updated.set(new Date());
        },
        error: (error) => {
          this.stats.set(null);
          this.latest.set([]);
          this.error.set(apiError(error));
        },
      });
  }
}
