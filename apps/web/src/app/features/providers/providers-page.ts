import { Component } from '@angular/core';
import { ProjectModelPanel } from './project-model-panel';
import { ProvidersPanel } from './providers-panel';
import { TEXTS } from './providers-texts';

// The /providers page: its title, the providers panel, then the "This project" model section.
@Component({
  imports: [ProvidersPanel, ProjectModelPanel],
  selector: 'app-providers-page',
  template: `
    <h2>{{ texts.pageHeading }}</h2>
    <app-providers-panel />
    <app-project-model-panel />
  `,
})
export class ProvidersPage {
  protected readonly texts = TEXTS;
}
