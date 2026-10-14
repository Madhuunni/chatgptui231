# Dynamic card headings

The optional top-level `tag` labels the JSON card and serves as the download heading fallback.
`report.tag` overrides the download heading. Both components also accept a `[tag]` input.
Missing, null, empty and whitespace-only API tags use the existing labels. Non-string tags are rejected.
Tags display as plain text and persist with saved messages.

```json
{
  "type": "json_download",
  "tag": "Overpayment details",
  "details": { "Case ID": "12345", "Balance Due": "3381.64" },
  "report": {
    "tag": "Download overpayment PDF",
    "url": "http://localhost:8080/YOUR_CONTEXT/overpayment/ExternalService",
    "fileName": "overpayment-report.pdf",
    "format": "pdf",
    "body": { "case_id": "12345" }
  }
}
```

Use your real URL and payload. This repository's existing POST download behavior is unchanged.
For wrapped responses, place `tag` alongside `type` inside `results.call_http_api` or its `data` object.
The downloading label still appears while the request is running.
