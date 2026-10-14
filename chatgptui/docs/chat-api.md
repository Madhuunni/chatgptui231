# Chat API contract

Every submitted chat message is sent using a real HTTP POST. There are no simulated responses.

## Request

`POST /api/chat`

Headers: `Content-Type: application/json`, `Accept: application/json`.

```json
{"query":"Show overpayment details for employee 12345","context":"","identifiers":{"case_id":"","employee_id":"","sr_no":""}}
```

The server returns one JSON object with HTTP 200 and `Content-Type: application/json`. `type` chooses the Angular template. `content` is always a string (it may be empty). The response is validated at runtime before being displayed or saved.

## 1. Text

```json
{"type":"text","content":"No matching records were found."}
```

## 2. Download

```json
{
  "type":"download",
  "content":"The report has been generated for the given criteria.",
  "report":{"url":"/api/reports/123/download","fileName":"report.pdf","format":"pdf"}
}
```

Use `format: "xls"` or `"xlsx"` and the corresponding filename for Excel. PDF displays a document icon; Excel displays an Excel icon. Format is explicit, so signed or extensionless URLs work. Return this response after the report is available.

## 3. JSON details

```json
{
  "type":"json",
  "content":"Here are the requested details.",
  "details":{
    "SR #":"JJCAN11028053Critical1llness",
    "Total Gross OVP":"4200.0",
    "PC Recovered":"500.0",
    "Balance Due":"3381.64",
    "Number of installment":"4",
    "Dedcution Recovered":"0.0",
    "Total Net OVP":"3881.64",
    "Earnings Recovered":"0.0",
    "Date Created":"Wed Aug 19 00:00:00 UTC 2026",
    "Gross/Net":"N"
  }
}
```

`details` is a flat JSON object, not a JSON-encoded string. Values may be string, number, boolean or null. Nested objects and arrays are rejected; flatten those fields on the backend for this card UI. Original keys, number strings, IDs, and dates are preserved. Text is interpolated safely, not injected as HTML.

## 4. JSON and download

```json
{
  "type":"json_download",
  "content":"Here are the details. Your report is ready to download.",
  "details":{"SR #":"12345","Balance Due":"3381.64"},
  "report":{"url":"/api/reports/123/download","fileName":"report.xlsx","format":"xlsx"}
}
```

## Configure the server

The default endpoint is `/api/chat`. `ng serve` proxies `/api/**` to `http://localhost:8000` through `proxy.conf.json`. Change that target to your backend's development address and restart `npm start`. Run the backend separately. This repository does not implement report generation or the API server.

For a different API path/host, provide `CHAT_API_URL` in `src/main.ts`:

```ts
import { CHAT_API_URL } from './app/core/chat.service';
// Add to the existing bootstrapApplication providers:
{ provide: CHAT_API_URL, useValue: 'https://your-api.example.com/chat' }
```

Production hosting must route `/api/*` to the backend; the Angular development proxy is not included in production hosting. With a different origin, configure backend CORS for the UI's origin. Browser fetch uses same-origin credentials by default; cross-origin authentication must be integrated for your backend. Do not put API keys into the Angular bundle.

Report URLs can be relative or HTTP(S). Prefer same-origin `/api/reports/...` links. Relative links resolve against the frontend, not the API server. For cross-origin URLs use a full URL and return `Content-Disposition: attachment; filename="report.xlsx"` (or PDF/XLS) from the download endpoint; browsers may ignore the `download` attribute across origins. Native links do not attach custom bearer headers; use cookie-authenticated or appropriately scoped signed download URLs. The backend must enforce report access. Expired signed URLs need regeneration through your backend.

## UI behavior

The user's message is shown immediately. While the POST is running, the UI shows Thinking and a Stop button. Stop, selecting another chat, and New chat abort the request. Requests time out after 60 seconds. HTTP/network failures and invalid responses show a readable error and do not insert a false success message. The user can resend their query.

`@switch(message.type)` selects plain text, file link, JSON cards, or cards plus file link. Existing responsive card styles remain unchanged. Replies are stored with their type. Older local chats are migrated in memory on load; legacy report file formats are inferred from filenames. Corrupt stored messages are skipped. The original localStorage key is retained.

## Verification

Run `npm test` for request/contract/cancellation/migration tests and `npm run build` for production compilation and Angular template checking. Unit tests use mocked fetch responses; they do not contact a live backend.
