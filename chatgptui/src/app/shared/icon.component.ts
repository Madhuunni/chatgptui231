import { Component, input } from '@angular/core';
@Component({
  selector: 'app-icon',
  template: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path [attr.d]="paths[name()] || paths['spark']" /></svg>`,
  styles: [':host{display:inline-flex;width:20px;height:20px;flex-shrink:0}svg{width:100%;height:100%}']
})
export class IconComponent {
  readonly name = input('spark');
  readonly paths: Record<string, string> = {
    download: 'M12 3v12 M8 11l4 4 4-4 M7 10H4a1 1 0 0 0-1 1v9a1 1 0 0 0 1 1h16a1 1 0 0 0 1-1v-9a1 1 0 0 0-1-1h-3',
    pdf: 'M5 2h9l5 5v15H5Z M14 2v6h5 M8 13h8 M8 17h5',
    excel: 'M9 3h12v18H9 M13 7h5 M13 11h5 M13 15h5 M2 7h10v12H2Z M5 10l4 6 M9 10l-4 6',
    panel: 'M4 3h16a1 1 0 0 1 1 1v16a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1Z M9 3v18',
    edit: 'M12 5H5a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-7 M15 3l6 6 M10 14l-1 4 4-1L22 6l-5-5Z',
    search: 'M21 21l-5-5 M18 10a8 8 0 1 1-16 0 8 8 0 0 1 16 0',
    spark: 'm12 3 2.4 6.6L21 12l-6.6 2.4L12 21l-2.4-6.6L3 12l6.6-2.4Z',
    arrow: 'M12 19V5 M5 12l7-7 7 7',
    close: 'm6 6 12 12 M6 18 18 6',
    moon: 'M20.8 13A9 9 0 0 1 11 3.2 9 9 0 1 0 20.8 13Z',
    sun: 'M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8 M12 2v2 M12 20v2 M2 12h2 M20 12h2 M5 5l1 1 M18 18l1 1 M5 19l1-1 M18 6l1-1',
    trash: 'M3 6h18 M9 6V3h6v3 M5 6l1 15h12l1-15 M10 10v7 M14 10v7',
    copy: 'M9 9h12v12H9Z M15 5V3H3v12h2',
    check: 'm5 12 4 4L19 6',
    code: 'm8 6-6 6 6 6 M16 6l6 6-6 6 M14 3l-4 18',
    book: 'M12 5v16 M12 5C8 2 4 3 2 4v15c4-2 7-1 10 2 3-3 6-4 10-2V4c-2-1-6-2-10 1Z',
    idea: 'M9 18h6 M9 21h6 M8 14a7 7 0 1 1 8 0l-1 2H9Z',
    chat: 'M21 11a9 9 0 0 1-9 9H3l2-4a9 9 0 1 1 16-5Z',
    stop: 'M6 6h12v12H6Z'
  };
}
