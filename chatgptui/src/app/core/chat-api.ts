import { ConversationReply, ConversationRequest, emptyConversationState, parseConversationReply } from './chat.models';

export async function requestChatReply(endpoint: string, message: string | ConversationRequest, signal: AbortSignal,
  timeoutMs = 60000, fetcher: typeof fetch = fetch): Promise<ConversationReply> {
  const payload: ConversationRequest = typeof message === 'string'
    ? { query: message, ...emptyConversationState() }
    : { query: message.query, context: message.context, identifiers: { ...message.identifiers } };
  const controller = new AbortController();
  let timedOut = false;
  const abort = () => controller.abort();
  if (signal.aborted) abort();
  else signal.addEventListener('abort', abort, { once: true });
  const timer = setTimeout(() => { timedOut = true; controller.abort(); }, timeoutMs);
  try {
    const response = await fetcher(endpoint, {
      method: 'POST', headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify(payload), signal: controller.signal
    });
    if (!response.ok) throw new Error(`Chat request failed (HTTP ${response.status}). Please try again.`);
    let data: unknown;
    try { data = await response.json(); }
    catch { throw new Error('The server returned invalid JSON.'); }
    try { return parseConversationReply(data, payload); }
    catch { throw new Error('The server returned an unsupported or incomplete chat response.'); }
  } catch (error) {
    if (signal.aborted) throw new DOMException('Stopped', 'AbortError');
    if (timedOut) throw new Error('The request timed out. Please try again.');
    if (error instanceof TypeError) throw new Error('Cannot reach the chat server. Please check your connection and API configuration.');
    throw error;
  } finally {
    clearTimeout(timer);
    signal.removeEventListener('abort', abort);
  }
}
