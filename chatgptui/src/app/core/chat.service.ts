import { inject, Injectable, InjectionToken } from '@angular/core';
import { ConversationReply, ConversationRequest } from './chat.models';
import { requestChatReply } from './chat-api';

export const CHAT_API_URL = new InjectionToken<string>('CHAT_API_URL', {
  providedIn: 'root', factory: () => '/api/chat'
});

@Injectable({ providedIn: 'root' })
export class ChatService {
  private readonly endpoint = inject(CHAT_API_URL);
  reply(message: ConversationRequest, signal: AbortSignal): Promise<ConversationReply> {
    return requestChatReply(this.endpoint, message, signal);
  }
}
