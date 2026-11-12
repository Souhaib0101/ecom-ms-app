import { Component, DestroyRef, ElementRef, inject, signal, viewChild } from '@angular/core';
import { CurrencyPipe } from '@angular/common';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { finalize, of, switchMap } from 'rxjs';
import { apiError } from '../../core/api-error';
import { EcomApi } from '../../core/ecom-api';
import { Page, Product } from '../../core/models';
import { Feedback } from '../../shared/feedback';
import { Pagination } from '../../shared/pagination';

@Component({
  imports: [CurrencyPipe, ReactiveFormsModule, Feedback, Pagination],
  templateUrl: './products.html',
})
export class Products {
  private readonly api = inject(EcomApi);
  private readonly destroyRef = inject(DestroyRef);
  private readonly nameInput = viewChild<ElementRef<HTMLInputElement>>('nameInput');
  private currentPage = 0;
  readonly result = signal<Page<Product> | null>(null);
  readonly loading = signal(false);
  readonly busy = signal(false);
  readonly error = signal('');
  readonly success = signal('');
  readonly editing = signal<Product | null>(null);
  readonly deleting = signal<Product | null>(null);
  readonly form = inject(FormBuilder).nonNullable.group({
    name: ['', [Validators.required, Validators.pattern(/\S/), Validators.maxLength(120)]],
    price: [
      0,
      [
        Validators.required,
        Validators.min(0),
        Validators.max(999999999.99),
        Validators.pattern(/^\d+(\.\d{1,2})?$/),
      ],
    ],
    quantity: [
      0,
      [
        Validators.required,
        Validators.min(0),
        Validators.max(2147483647),
        Validators.pattern(/^\d+$/),
      ],
    ],
  });

  constructor() {
    this.load();
  }

  load(page = this.currentPage): void {
    this.loading.set(true);
    this.error.set('');
    this.api
      .products(page)
      .pipe(
        switchMap((result) =>
          result.number > Math.max(0, result.totalPages - 1)
            ? this.api.products(Math.max(0, result.totalPages - 1))
            : of(result),
        ),
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.loading.set(false)),
      )
      .subscribe({
        next: (result) => {
          this.result.set(result);
          this.currentPage = result.number;
        },
        error: (error) => {
          this.result.set(null);
          this.error.set(apiError(error));
        },
      });
  }

  edit(product: Product): void {
    this.editing.set(product);
    this.form.reset({ name: product.name, price: product.price, quantity: product.quantity });
    this.nameInput()?.nativeElement.focus();
  }

  reset(): void {
    this.editing.set(null);
    this.form.reset({ name: '', price: 0, quantity: 0 });
  }

  save(): void {
    if (this.busy()) return;
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const value = this.form.getRawValue();
    this.busy.set(true);
    this.error.set('');
    this.success.set('');
    this.api
      .saveProduct({ ...value, name: value.name.trim() }, this.editing()?.id)
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.busy.set(false)),
      )
      .subscribe({
        next: () => {
          this.success.set('Le produit a bien été enregistré.');
          this.reset();
          this.load();
        },
        error: (error) => this.error.set(apiError(error)),
      });
  }

  remove(): void {
    const product = this.deleting();
    if (!product || this.busy()) return;
    this.busy.set(true);
    this.error.set('');
    this.success.set('');
    this.api
      .deleteProduct(product.id)
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.busy.set(false)),
      )
      .subscribe({
        next: () => {
          this.deleting.set(null);
          if (this.editing()?.id === product.id) this.reset();
          this.success.set('Le produit a bien été supprimé.');
          this.load(
            this.result()?.items.length === 1
              ? Math.max(0, this.currentPage - 1)
              : this.currentPage,
          );
        },
        error: (error) => this.error.set(apiError(error)),
      });
  }
}
