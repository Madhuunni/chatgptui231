import { ReportDownload } from './chat.models';

/** Fetch bytes without navigating the browser away from the conversation. */
export async function fetchReportBlob(report: ReportDownload, signal: AbortSignal,
  fetcher: typeof fetch = fetch): Promise<Blob> {
  const response = await fetcher(report.url, {
    method: 'POST', headers: { 'Content-Type': 'application/json',
      Accept: report.format === 'pdf' ? 'application/pdf' : 'application/octet-stream' },
    body: JSON.stringify(report.body ?? {}), signal
  });
  if (!response.ok) throw new Error(`Report download failed (HTTP ${response.status}).`);
  const mime = (response.headers.get('Content-Type') ?? '').toLowerCase();
  if (mime.includes('json') || mime.includes('text/html'))
    throw new Error('The report server returned a message instead of a file.');
  const blob = await response.blob();
  if (!blob.size) throw new Error('The report server returned an empty file.');
  return blob;
}
