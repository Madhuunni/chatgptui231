import { Component, computed, input } from '@angular/core';
import { ResponseDetails } from '../core/chat.models';

@Component({
  selector: 'app-json-details',
  templateUrl: './json-details.component.html',
  styleUrl: './json-details.component.css'
})
export class JsonDetailsComponent {
  readonly tag = input<string | null>();
  readonly heading = computed(() => this.tag()?.trim() || 'Response details');
  readonly data = input.required<ResponseDetails>();
  // Object.entries preserves source property order for these non-integer keys.
  readonly fields = computed(() => Object.entries(this.data()).map(([key, value]) => ({
    key,
    value: value === null || value === '' ? '—' : String(value),
    prominent: key === 'Balance Due',
    wide: key === 'SR #' || key === 'Date Created'
  })));
}
