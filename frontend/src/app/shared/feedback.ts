import { Component, input } from '@angular/core';

@Component({
  selector: 'app-feedback',
  template: `@if (message()) {
    <div
      class="feedback"
      [class.success]="kind() === 'success'"
      [attr.role]="kind() === 'error' ? 'alert' : 'status'"
    >
      {{ message() }}
    </div>
  }`,
})
export class Feedback {
  readonly message = input('');
  readonly kind = input<'error' | 'success'>('error');
}
