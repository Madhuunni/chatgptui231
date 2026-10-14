import { CHAT_UI } from '../core/chat-ui.config';
import { Component, computed, inject, input, output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ChatStore } from '../core/chat.store';
import { IconComponent } from '../shared/icon.component';
@Component({
  selector: 'app-sidebar', imports: [FormsModule, IconComponent], templateUrl: './sidebar.component.html'
})
export class SidebarComponent {
  readonly ui = CHAT_UI;
  readonly store = inject(ChatStore);
  readonly toggleSidebar = output<void>();
  readonly expand = output<void>();
  readonly collapsed = input(false);
  readonly navigate = output<void>();
  readonly search = signal('');
  readonly searching = signal(false);
  readonly filtered = computed(() => this.store.conversations().filter(c => (c.title + ' ' + c.messages.map(m => m.content).join(' ')).toLowerCase().includes(this.search().toLowerCase())));
  toggleSearch(): void {
    if (this.collapsed()) {
      this.expand.emit();
      this.searching.set(true);
    } else {
      this.searching.update(value => !value);
    }
    this.search.set('');
  }
  newChat(): void { this.store.newChat(); this.navigate.emit(); }
  select(id: string): void { this.store.select(id); this.navigate.emit(); }
}
