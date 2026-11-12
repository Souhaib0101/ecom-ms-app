import { CurrencyPipe, DatePipe } from '@angular/common';
import { Component, DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { BehaviorSubject, catchError, combineLatest, finalize, of, switchMap } from 'rxjs';
import { apiError } from '../../core/api-error';
import { EcomApi } from '../../core/ecom-api';
import { BillSummary, Customer } from '../../core/models';
import { Feedback } from '../../shared/feedback';

@Component({
  imports: [CurrencyPipe, DatePipe, RouterLink, Feedback],
  templateUrl: './bills.html',
})
export class Bills {
  private readonly api = inject(EcomApi);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);
  private readonly refresh = new BehaviorSubject<void>(undefined);
  readonly bills = signal<BillSummary[]>([]);
  readonly customers = signal<Customer[]>([]);
  readonly selectedCustomer = signal<number | undefined>(undefined);
  readonly loading = signal(true);
  readonly error = signal('');
  readonly lookupError = signal('');

  constructor() {
    this.loadCustomers();
    combineLatest([this.route.queryParamMap, this.refresh]).pipe(
      switchMap(([params]) => {
        const value = Number(params.get('client'));
        const customerId = Number.isSafeInteger(value) && value > 0 ? value : undefined;
        this.selectedCustomer.set(customerId);
        this.loading.set(true);
        this.error.set('');
        return this.api.bills(customerId).pipe(
          catchError((error) => { this.error.set(apiError(error)); return of([]); }),
          finalize(() => this.loading.set(false)),
        );
      }),
      takeUntilDestroyed(),
    ).subscribe((bills) => this.bills.set([...bills].sort((a, b) => b.id - a.id)));
  }

  reload(): void { this.refresh.next(); this.loadCustomers(); }

  filter(event: Event): void {
    const value = (event.target as HTMLSelectElement).value;
    void this.router.navigate([], { relativeTo: this.route, queryParams: { client: value || null }, queryParamsHandling: 'merge' });
  }

  customerName(id: number): string {
    return this.customers().find((customer) => customer.id === id)?.name ?? `Client #${id}`;
  }

  private loadCustomers(): void {
    this.lookupError.set('');
    this.api.allCustomers().pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: (customers) => this.customers.set(customers),
      error: () => this.lookupError.set('Les noms des clients sont indisponibles. Les factures restent consultables avec leur référence client.'),
    });
  }
}
