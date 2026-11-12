import { Component, DestroyRef, ElementRef, inject, signal, viewChild } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { finalize, of, switchMap } from 'rxjs';
import { apiError } from '../../core/api-error';
import { EcomApi } from '../../core/ecom-api';
import { Customer, Page } from '../../core/models';
import { Feedback } from '../../shared/feedback';
import { Pagination } from '../../shared/pagination';

@Component({
  imports: [ReactiveFormsModule, RouterLink, Feedback, Pagination],
  templateUrl: './customers.html',
})
export class Customers {
  private readonly api = inject(EcomApi);
  private readonly destroyRef = inject(DestroyRef);
  private readonly nameInput = viewChild<ElementRef<HTMLInputElement>>('nameInput');
  private currentPage = 0;
  readonly result = signal<Page<Customer> | null>(null);
  readonly loading = signal(false);
  readonly busy = signal(false);
  readonly error = signal('');
  readonly success = signal('');
  readonly editing = signal<Customer | null>(null);
  readonly deleting = signal<Customer | null>(null);
  readonly form = inject(FormBuilder).nonNullable.group({
    name: ['', [Validators.required, Validators.pattern(/\S/), Validators.maxLength(120)]],
    email: ['', [Validators.required, Validators.email, Validators.maxLength(254)]],
  });

  constructor() {
    this.load();
  }

  load(page = this.currentPage): void {
    this.loading.set(true);
    this.error.set('');
    this.api
      .customers(page)
      .pipe(
        switchMap((result) =>
          result.number > Math.max(0, result.totalPages - 1)
            ? this.api.customers(Math.max(0, result.totalPages - 1))
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

  edit(customer: Customer): void {
    this.editing.set(customer);
    this.form.reset({ name: customer.name, email: customer.email });
    this.nameInput()?.nativeElement.focus();
  }

  reset(): void {
    this.editing.set(null);
    this.form.reset({ name: '', email: '' });
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
      .saveCustomer({ name: value.name.trim(), email: value.email.trim() }, this.editing()?.id)
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.busy.set(false)),
      )
      .subscribe({
        next: () => {
          this.success.set('Le client a bien été enregistré.');
          this.reset();
          this.load();
        },
        error: (error) => this.error.set(apiError(error)),
      });
  }

  remove(): void {
    const customer = this.deleting();
    if (!customer || this.busy()) return;
    this.busy.set(true);
    this.error.set('');
    this.success.set('');
    this.api
      .deleteCustomer(customer.id)
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.busy.set(false)),
      )
      .subscribe({
        next: () => {
          this.deleting.set(null);
          if (this.editing()?.id === customer.id) this.reset();
          this.success.set('Le client a bien été supprimé.');
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
