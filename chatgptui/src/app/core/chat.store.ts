import { computed, inject, Injectable, signal } from '@angular/core';
import { ChatService } from './chat.service';
import { Conversation, Message, isRecord, restoreMessage, emptyConversationState, readConversationState } from './chat.models';
const KEY = 'angular-chat-ui.conversations.v1';
@Injectable({ providedIn: 'root' })
export class ChatStore {
  private readonly api = inject(ChatService);
  readonly conversations = signal<Conversation[]>(this.restore());
  readonly activeId = signal<string | null>(null);
  readonly active = computed(() => this.conversations().find(c => c.id === this.activeId()));
  readonly messages = computed(() => this.active()?.messages ?? []);
  readonly busy = signal(false);
  readonly error = signal('');
  private controller?: AbortController;

  newChat(): void { this.stop(); this.activeId.set(null); this.error.set(''); }
  select(id: string): void { this.stop(); this.activeId.set(id); this.error.set(''); }
  remove(id: string): void {
    if (this.activeId() === id) this.newChat();
    this.conversations.update(items => items.filter(c => c.id !== id));
    this.persist();
  }
  stop(): void { this.controller?.abort(); this.controller = undefined; this.busy.set(false); }
  async send(raw: string): Promise<void> {
    const content = raw.trim();
    if (!content || this.busy()) return;
    this.error.set('');
    let id = this.activeId();
    if (!id) {
      id = crypto.randomUUID();
      this.conversations.update(items => [{ id: id!, title: content.slice(0, 48), updatedAt: Date.now(), messages: [] }, ...items]);
      this.activeId.set(id);
    }
    this.append(id, { id: crypto.randomUUID(), role: 'user', type: 'text', content });
    const controller = new AbortController();
    this.controller = controller;
    this.busy.set(true);
    try {
      const state = this.conversations().find(c => c.id === id)?.conversationState ?? emptyConversationState();
      const response = await this.api.reply({ query: content, ...state }, controller.signal);
      if (!controller.signal.aborted) {
        const { conversationState, ...reply } = response;
        if (conversationState) this.conversations.update(items => items.map(c =>
          c.id === id ? { ...c, conversationState } : c));
        this.append(id, { ...reply, id: crypto.randomUUID(), role: 'assistant' });
      }
    } catch (error) {
      if (!controller.signal.aborted) this.error.set(error instanceof Error ? error.message : 'Could not get a response. Please try again.');
    } finally {
      if (this.controller === controller) { this.busy.set(false); this.controller = undefined; }
    }
  }
  private append(id: string, message: Message): void {
    this.conversations.update(items => items.map(c => c.id === id ? { ...c, updatedAt: Date.now(), messages: [...c.messages, message] } : c).sort((a, b) => b.updatedAt - a.updatedAt));
    this.persist();
  }
  private persist(): void {
    try { localStorage.setItem(KEY, JSON.stringify(this.conversations())); }
    catch { this.error.set('Browser storage is unavailable or full. This session’s new changes may not be saved.'); }
  }
  private restore(): Conversation[] {
    try {
      const data: unknown = JSON.parse(localStorage.getItem(KEY) ?? '[]');
      if (!Array.isArray(data)) return [];
      const conversations: Conversation[] = [];
      for (const item of data) {
        if (!isRecord(item) || typeof item['id'] !== 'string' || typeof item['title'] !== 'string'
          || typeof item['updatedAt'] !== 'number' || !Array.isArray(item['messages'])) continue;
        const messages = item['messages'].map(restoreMessage).filter((m): m is Message => m !== null);
        let conversationState = emptyConversationState();
        try { conversationState = readConversationState(item['conversationState'] ?? {}); } catch { /* Reset invalid saved state. */ }
        conversations.push({ conversationState, id: item['id'], title: item['title'], updatedAt: item['updatedAt'], messages });
      }
      return conversations;
    } catch { return []; }
  }
}
