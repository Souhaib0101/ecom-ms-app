import { CurrencyPipe } from '@angular/common';
import { Component, computed, DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import {
  AbstractControl,
  FormBuilder,
  ReactiveFormsModule,
  ValidationErrors,
  Validators,
} from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { finalize, forkJoin, startWith } from 'rxjs';
import { apiError } from '../../core/api-error';
import { EcomApi } from '../../core/ecom-api';
import { Customer, Product } from '../../core/models';
import { Feedback } from '../../shared/feedback';

function uniqueProducts(control: AbstractControl): ValidationErrors | null {
  const ids = (control.value as { productId: number }[])
    .map((item) => item.productId)
    .filter((id) => id > 0);
  return new Set(ids).size === ids.length ? null : { duplicateProducts: true };
}

@Component({
  imports: [CurrencyPipe, ReactiveFormsModule, RouterLink, Feedback],
  templateUrl: './bill-create.html',
  styleUrl: './bill-create.css',
})
export class BillCreate {
  private readonly api = inject(EcomApi);
  private readonly fb = inject(FormBuilder).nonNullable;
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);
  readonly customers = signal<Customer[]>([]);
  readonly products = signal<Product[]>([]);
  readonly loading = signal(false);
  readonly loaded = signal(false);
  readonly saving = signal(false);
  readonly error = signal('');
  readonly form = this.fb.group({
    customerId: [0, [Validators.required, Validators.min(1)]],
    items: this.fb.array([this.newLine()], { validators: uniqueProducts }),
  });
  readonly values = toSignal(this.form.valueChanges.pipe(startWith(this.form.getRawValue())), {
    requireSync: true,
  });
  readonly total = computed(
    () =>
      (this.values().items ?? []).reduce((sum, _, index) => sum + this.lineCents(index), 0) / 100,
  );

  constructor() {
    this.load();
  }

  load(): void {
    this.loading.set(true);
    this.loaded.set(false);
    this.error.set('');
    forkJoin({ customers: this.api.allCustomers(), products: this.api.allProducts() })
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.loading.set(false)),
      )
      .subscribe({
        next: ({ customers, products }) => {
          this.customers.set(customers);
          this.products.set(products);
          const customer = this.form.controls.customerId;
          if (customer.value && !customers.some((item) => item.id === customer.value)) {
            customer.setValue(0);
            customer.markAsTouched();
          }
          for (const line of this.form.controls.items.controls) {
            const product = line.controls.productId;
            if (product.value && !products.some((item) => item.id === product.value)) {
              product.setValue(0);
              product.markAsTouched();
            }
          }
          this.loaded.set(true);
        },
        error: (error) => this.error.set(apiError(error)),
      });
  }

  addLine(): void {
    if (!this.saving() && this.form.controls.items.length < 100)
      this.form.controls.items.push(this.newLine());
  }

  removeLine(index: number): void {
    if (!this.saving() && this.form.controls.items.length > 1)
      this.form.controls.items.removeAt(index);
  }

  lineAmount(index: number): number {
    return this.lineCents(index) / 100;
  }

  save(): void {
    if (this.saving() || this.loading() || !this.loaded()) return;
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    this.saving.set(true);
    this.error.set('');
    this.api
      .createBill(this.form.getRawValue())
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.saving.set(false)),
      )
      .subscribe({
        next: (bill) => {
          this.form.markAsPristine();
          void this.router.navigate(['/factures', bill.id]);
        },
        error: (error) => this.error.set(apiError(error)),
      });
  }

  private newLine() {
    return this.fb.group({
      productId: [0, [Validators.required, Validators.min(1)]],
      quantity: [
        1,
        [
          Validators.required,
          Validators.min(1),
          Validators.max(2147483647),
          Validators.pattern(/^\d+$/),
        ],
      ],
    });
  }

  private lineCents(index: number): number {
    const item = this.values().items?.[index];
    const product = this.products().find((product) => product.id === item?.productId);
    return Math.round((product?.price ?? 0) * 100) * (item?.quantity ?? 0);
  }
}
