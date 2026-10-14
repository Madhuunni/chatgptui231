export type DetailValue = string | number | boolean | null;
export type ResponseDetails = Record<string, DetailValue>;
export type ReportFormat = 'pdf' | 'xls' | 'xlsx';
export type JsonValue = string | number | boolean | null | JsonValue[] | { [key: string]: JsonValue };
export interface ReportDownload { tag?: string; url: string; fileName: string; format: ReportFormat; body?: Record<string, JsonValue>; }
export type ChatReply = { tag?: string } & (
  | { type: 'text'; content: string; details?: never; report?: never }
  | { type: 'download'; content: string; report: ReportDownload; details?: never }
  | { type: 'json'; content: string; details: ResponseDetails; report?: never }
  | { type: 'json_download'; content: string; details: ResponseDetails; report: ReportDownload });
export type Message = ChatReply & { id: string; role: 'user' | 'assistant' };
export interface Conversation { id: string; title: string; updatedAt: number; messages: Message[]; conversationState?: ConversationState; }

export function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}
export function isResponseDetails(value: unknown): value is ResponseDetails {
  return isRecord(value) && Object.values(value).every(item => item === null || typeof item === 'string'
    || typeof item === 'boolean' || (typeof item === 'number' && Number.isFinite(item)));
}
function parseTag(value: unknown): { tag?: string } {
  if (value === undefined || value === null) return {};
  if (typeof value !== 'string') throw new Error('Invalid heading tag: expected a string.');
  const tag = value.trim();
  return tag ? { tag } : {};
}
function parseReport(value: unknown): ReportDownload {
  if (!isRecord(value) || typeof value['url'] !== 'string' || !value['url'].trim()
    || typeof value['fileName'] !== 'string' || !value['fileName'].trim()
    || !['pdf', 'xls', 'xlsx'].includes(String(value['format']))) throw new Error('Invalid report metadata.');
  // Permit relative URLs and HTTP(S); reject javascript:, data:, file: and malformed URLs.
  const url = value['url'].trim();
  if (!['http:', 'https:'].includes(new URL(url, 'https://chat.invalid/').protocol)) throw new Error('Invalid report URL.');
  if (value['body'] !== undefined && !isRecord(value['body'])) throw new Error('Invalid report POST body.');
  return { ...parseTag(value['tag']), url, fileName: value['fileName'], format: value['format'] as ReportFormat,
    ...(value['body'] === undefined ? {} : { body: value['body'] as Record<string, JsonValue> }) };

}
/** Runtime validation is required: a TypeScript type alone does not validate API JSON. */
export function parseChatReply(value: unknown): ChatReply {
  if (!isRecord(value)) throw new Error('Invalid response content.');
  const structured = ['json', 'download', 'json_download'].includes(String(value['type']));
  if (typeof value['content'] !== 'string' && !(structured && value['content'] === undefined))
    throw new Error('Invalid response content.');
  const content = typeof value['content'] === 'string' ? value['content'] : '';
  const heading = parseTag(value['tag']);
  switch (value['type']) {
    case 'text': return { ...heading, type: 'text', content };
    case 'download': return { ...heading, type: 'download', content, report: parseReport(value['report']) };
    case 'json':
    case 'json_download': {
      if (!isResponseDetails(value['details'])) throw new Error('Invalid response details.');
      const details = value['details'];
      return value['type'] === 'json' ? { ...heading, type: 'json', content, details }
        : { ...heading, type: 'json_download', content, details, report: parseReport(value['report']) };
    }
    default: throw new Error('Unsupported response type.');
  }
}
/** Migrate only stored messages from the earlier untyped UI; HTTP responses must include type. */
export function restoreMessage(value: unknown): Message | null {
  if (!isRecord(value) || typeof value['id'] !== 'string'
    || !['user', 'assistant'].includes(String(value['role']))) return null;
  try {
    let payload = value;
    if (value['type'] === undefined) {
      const hasDetails = value['details'] !== undefined;
      const oldReport = value['report'];
      const hasReport = oldReport !== undefined;
      let report = oldReport;
      if (isRecord(oldReport) && oldReport['format'] === undefined) {
        const name = String(oldReport['fileName']).toLowerCase();
        const format = name.endsWith('.pdf') ? 'pdf' : name.endsWith('.xls') ? 'xls' : 'xlsx';
        report = { ...oldReport, format };
      }
      payload = { ...value, report, type: hasDetails ? (hasReport ? 'json_download' : 'json') : (hasReport ? 'download' : 'text') };
    }
    return { ...parseChatReply(payload), id: value['id'], role: value['role'] as 'user' | 'assistant' };
  } catch { return null; }
}

export interface Identifiers { case_id: string; employee_id: string; sr_no: string; }
export interface ConversationState { context: string; identifiers: Identifiers; }
export interface ConversationRequest extends ConversationState { query: string; }
export type ConversationReply = ChatReply & { conversationState?: ConversationState };
export function emptyConversationState(): ConversationState {
  return { context: '', identifiers: { case_id: '', employee_id: '', sr_no: '' } };
}
/** Omitted fields retain their previous value; explicit empty strings clear it. */
export function readConversationState(value: unknown, previous = emptyConversationState()): ConversationState {
  if (!isRecord(value)) throw new Error('Invalid conversation state.');
  const context = value['context'] === undefined ? previous.context : value['context'];
  if (typeof context !== 'string') throw new Error('Invalid context.');
  const identifiers = { ...previous.identifiers };
  if (value['identifiers'] !== undefined) {
    if (!isRecord(value['identifiers'])) throw new Error('Invalid identifiers.');
    for (const key of ['case_id', 'employee_id', 'sr_no'] as const) {
      const id = value['identifiers'][key];
      if (id !== undefined) {
        if (typeof id !== 'string') throw new Error('Identifiers must be strings.');
        identifiers[key] = id;
      }
    }
  }
  return { context, identifiers };
}
export function parseConversationReply(value: unknown, previous: ConversationState): ConversationReply {
  if (!isRecord(value)) throw new Error('Invalid response.');
  const hasState = value['context'] !== undefined || value['identifiers'] !== undefined;
  const conversationState = readConversationState(value, previous);
  if (value['action_required'] !== undefined && typeof value['action_required'] !== 'string')
    throw new Error('Invalid action_required.');
  const action = value['action_required'];
  const results = value['results'];
  const httpResult = isRecord(results) ? results['call_http_api'] : undefined;
  // Support both the direct task result and the original {status_code, data} wrapper.
  const payload = value['type'] !== undefined ? value
    : isRecord(httpResult) && httpResult['type'] !== undefined ? httpResult
    : isRecord(httpResult) && isRecord(httpResult['data']) && httpResult['data']['type'] !== undefined
      ? httpResult['data'] : undefined;
  let reply: ChatReply;
  if (typeof action === 'string' && action.trim()) {
    reply = { type: 'text', content: action };
  } else if (payload !== undefined) {
    reply = parseChatReply(payload);
  } else {
    if (!hasState) throw new Error('Missing conversation response.');
    reply = { type: 'text', content: JSON.stringify(value['results'] ?? value, null, 2) };
  }
  return hasState ? { ...reply, conversationState } : reply;
}
