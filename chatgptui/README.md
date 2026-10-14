# Angular 21 Chat UI

A standalone, zoneless Angular 21 project with a ChatGPT-inspired sidebar and central chat panel. This is an independent UI implementation, not an official OpenAI application.

## Run

This version supports Node.js 22.14.0. Angular 21 requires Node.js ^20.19.0, ^22.12.0, or ^24.0.0. The included `.nvmrc` selects 22.14.0 when using nvm.

```bash
npm install
npm start
```

Open http://localhost:4200. For a different port: `npm start -- --port 4300`.

```bash
npm run build
```

Production output: `dist/angular-chat-ui/browser/`.

## Included

- Responsive left sidebar with a mobile drawer and collapse controls.
- Central chat panel with welcome prompts and multi-line message composer.
- Enter to send; Shift+Enter for a new line; IME composition support.
- New conversations, search, select and delete history.
- Local browser persistence for conversations and appearance.
- Light and dark themes, copy response, request loading and stop controls.
- Accessible labels, keyboard focus states and reduced-motion support.
- Angular signals, standalone components, strict template checking, and CSS without a UI framework.

## Structure

```text
src/app/
  app.component.ts            Main layout and composer behavior
  app.component.html          Welcome, messages, composer
  sidebar/                    Menu, history, search, theme controls
  shared/icon.component.ts    Local SVG icons
  core/chat.models.ts         Conversation and message types
  core/chat.store.ts          State, persistence and request cancellation
  core/chat.service.ts        HTTP chat service and configurable endpoint
src/styles.css                Themes and responsive styles
```

## Chat backend and response formats

Messages POST to `/api/chat`. The server selects the UI using `type`: `text`, `download`, `json`, or `json_download`. PDF, XLS and XLSX downloads are supported.

See [docs/chat-api.md](docs/chat-api.md) for the request/response examples, endpoint configuration, development proxy, download headers, and error handling. Start your backend on port 8000 or update `proxy.conf.json`.

Chats remain stored under `angular-chat-ui.conversations.v1`; older messages are migrated when loaded.

## Verification

Run `npm test` and `npm run build`. Contract tests cover all four response types, PDF/Excel metadata, invalid responses, HTTP/network errors, cancellation, timeouts, and legacy history migration. Backend integration tests use mocked HTTP responses; a live backend is required for end-to-end use.


## Conversation state update

Every POST sends exactly `query`, `context`, and `identifiers` (with string
`case_id`, `employee_id`, `sr_no`). The user message goes into `query`.
Response context and identifiers are saved per chat and reused on its next turn.
Omitted fields retain their prior values; explicit empty strings clear values.
State persists with browser chat history. New chat starts with empty state;
switching chats restores that chat's state. Context is not automatically cleared
on completion in this update. Use New chat for a new topic.

Existing typed responses still render normally. Plain workflow responses are
also supported: `action_required` is displayed as the assistant message;
otherwise `results` (or the response itself) is displayed as JSON text.

The existing endpoint remains `/api/chat`. To connect directly to the query
pipeline's `/evaluate`, set the CHAT_API_URL provider to
`http://localhost:8000/evaluate` (backend CORS must allow the frontend), or add
`"pathRewrite": { "^/api/chat": "/evaluate" }` to the `/api/**` entry in
`proxy.conf.json`. Restart the development server after changing the proxy.

Changed: chat-api.ts, chat.service.ts, chat.store.ts, chat.models.ts,
tests/chat-api.test.cjs, README.md, docs/chat-api.md.

### Nested HTTP task responses
The renderer reads typed replies from `results.call_http_api` or
`results.call_http_api.data`, as well as the original top-level format.
Conversation state still comes from the outer response. Nonempty
`action_required` takes priority. Structured replies may omit `content`;
`json_download` still requires valid `details` and `report` metadata.

### POST report downloads
The report control POSTs JSON, receives a Blob, and downloads it without navigating.
Set `report.body` to the JSON required by your report endpoint; if omitted, `{}` is sent.
Example: `"report":{"url":"http://localhost:8080/report","fileName":"snapshot-report.pdf","format":"pdf","body":{"case_id":"711056"}}`.
The server should return file bytes. Cross-origin endpoints must allow the frontend
origin, POST, and Content-Type through CORS, including OPTIONS preflight.
Result tiles now use 90% width and 10% smaller padding and text.

### Replaceable page logo
A fixed-height page header sits above the sidebar and chat. Replace
`public/branding/logo.svg` with your own SVG using the same filename. For a PNG,
JPG, or WebP, place it in `public/branding/` and change `logoUrl` in
`src/app/core/branding.config.ts`, for example `branding/company-logo.png`.
Update `logoAlt` and `title` in the same config. Set `title` to an empty string
for a logo-only header. The logo preserves its aspect ratio; a missing image
shows a fallback icon. Header/logo dimensions are at the bottom of `src/styles.css`.
The header stays visible while the conversation scrolls.
