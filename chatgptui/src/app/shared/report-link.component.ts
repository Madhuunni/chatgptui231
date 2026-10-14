import { Component, computed, input, signal, OnDestroy } from '@angular/core';
import { ReportDownload } from '../core/chat.models';
import { fetchReportBlob } from '../core/report-download';
import { IconComponent } from './icon.component';

@Component({
  selector: 'app-report-link',
  imports: [IconComponent],
  styles: [`.report-download{font-family:inherit;text-align:left;color:inherit;cursor:pointer}
    .report-download:disabled{cursor:wait;opacity:.65}.download-error{color:#b83a32;font-size:13px}`],
  template: `
    <button type="button" class="report-download" (click)="download()" [disabled]="downloading()"
       [class.pdf-download]="report().format === 'pdf'"
       [attr.aria-label]="heading() + ': ' + report().fileName" [attr.aria-busy]="downloading()">
      <app-icon [name]="report().format === 'pdf' ? 'pdf' : 'excel'" />
      <span>{{ downloading() ? 'Downloading report…' : heading() }}
        <small>{{ report().fileName }} · {{ report().format === 'pdf' ? 'PDF document' : 'Excel workbook' }}</small>
      </span>
    </button>
    @if (error()) { <p class="download-error" role="alert">{{ error() }}</p> }`
})
export class ReportLinkComponent implements OnDestroy {
  readonly tag = input<string | null>();
  readonly heading = computed(() => this.tag()?.trim() || this.report().tag?.trim() || 'Click here to download the report');
  readonly report = input.required<ReportDownload>();
  readonly downloading = signal(false);
  readonly error = signal('');
  private controller?: AbortController;

  async download(): Promise<void> {
    if (this.downloading()) return;
    this.downloading.set(true);
    this.error.set('');
    const controller = new AbortController();
    this.controller = controller;
    const timer = setTimeout(() => controller.abort(), 60000);
    try {
      const report = this.report();
      const blob = await fetchReportBlob(report, controller.signal);
      if (controller.signal.aborted) return;
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = report.fileName;
      link.hidden = true;
      document.body.appendChild(link);
      try { link.click(); }
      finally { link.remove(); setTimeout(() => URL.revokeObjectURL(url), 60000); }
    } catch (error) {
      this.error.set(controller.signal.aborted ? 'Report download stopped or timed out. Please try again.'
        : error instanceof TypeError ? 'Cannot reach the report server. Check the connection and server CORS settings.'
        : error instanceof Error ? error.message : 'Could not download the report.');
    } finally {
      clearTimeout(timer);
      this.downloading.set(false);
      if (this.controller === controller) this.controller = undefined;
    }
  }
  ngOnDestroy(): void { this.controller?.abort(); }
}
