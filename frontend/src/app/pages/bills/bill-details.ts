import { CurrencyPipe, DatePipe } from '@angular/common';
import { Component, computed, DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { catchError, finalize, of, switchMap } from 'rxjs';
import { apiError } from '../../core/api-error';
import { EcomApi } from '../../core/ecom-api';
import { Bill } from '../../core/models';
import { Feedback } from '../../shared/feedback';

@Component({
  imports: [CurrencyPipe, DatePipe, RouterLink, Feedback],
  templateUrl: './bill-details.html',
  styleUrl: './bill-details.css',
})
export class BillDetails {
  private readonly api = inject(EcomApi);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);
  readonly bill = signal<Bill | null>(null);
  readonly loading = signal(true);
  readonly deleting = signal(false);
  readonly confirming = signal(false);
  readonly error = signal('');
  readonly partial = computed(() => {
    const bill = this.bill();
    return bill !== null && (!bill.customer || bill.customer.name === 'Default customer'
      || bill.productItems.some((item) => !item.product?.name));
  });

  constructor() {
    inject(ActivatedRoute).paramMap.pipe(
      switchMap((params) => {
        const id = Number(params.get('id'));
        this.loading.set(true);
        this.error.set('');
        this.confirming.set(false);
        if (!Number.isSafeInteger(id) || id <= 0) {
          this.error.set('Le numéro de facture est invalide.');
          this.loading.set(false);
          return of(null);
        }
        return this.api.bill(id).pipe(catchError((error) => { this.error.set(apiError(error)); return of(null); }), finalize(() => this.loading.set(false)));
      }),
      takeUntilDestroyed(),
    ).subscribe((bill) => this.bill.set(bill));
  }

  print(): void { window.print(); }

  remove(): void {
    const bill = this.bill();
    if (!bill || this.deleting()) return;
    this.deleting.set(true);
    this.error.set('');
    this.api.deleteBill(bill.id).pipe(takeUntilDestroyed(this.destroyRef), finalize(() => this.deleting.set(false))).subscribe({
      next: () => void this.router.navigate(['/factures']),
      error: (error) => this.error.set(apiError(error)),
    });
  }
}
