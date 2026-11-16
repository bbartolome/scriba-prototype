import { Component } from '@angular/core';
import { ProvidersPanel } from './providers-panel';
import { TEXTS } from './providers-texts';

// The /providers page: its title, then the providers panel. MPR-13 adds its section after the panel.
@Component({
  imports: [ProvidersPanel],
  selector: 'app-providers-page',
  template: `
    <h2>{{ texts.pageHeading }}</h2>
    <app-providers-panel />
  `,
})
export class ProvidersPage {
  protected readonly texts = TEXTS;
}
