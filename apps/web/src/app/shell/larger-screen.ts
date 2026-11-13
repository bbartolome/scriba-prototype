import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';

/**
 * Shown at a gated URL on a device that is too small for the view. The URL
 * stays as the user asked for it; back returns to the previous page.
 */
@Component({
  imports: [RouterLink],
  selector: 'app-larger-screen',
  template: `
    <h2>This page needs a larger screen</h2>
    <p>Open this page on a tablet or a computer to use it.</p>
    <p><a routerLink="/">Go to the start page</a></p>
  `,
})
export class LargerScreenPage {}
