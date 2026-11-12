import { Component, input, output } from '@angular/core';
import { PageInfo } from '../core/models';

@Component({
  selector: 'app-pagination',
  template: `@if (page(); as result) {
    <div class="pagination"><span>{{ result.totalElements }} résultat(s) · Page {{ result.number + 1 }} sur {{ result.totalPages || 1 }}</span>
      <div class="pagination-actions"><button class="button secondary small" type="button" [disabled]="busy() || result.number === 0" (click)="change.emit(result.number - 1)">Précédent</button><button class="button secondary small" type="button" [disabled]="busy() || result.number + 1 >= result.totalPages" (click)="change.emit(result.number + 1)">Suivant</button></div>
    </div>
  }`,
})
export class Pagination {
  readonly page = input<PageInfo | null>(null);
  readonly busy = input(false);
  readonly change = output<number>();
}
