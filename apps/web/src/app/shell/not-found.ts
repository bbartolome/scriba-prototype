import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
  imports: [RouterLink],
  selector: 'app-not-found',
  template: `
    <h2>Page not found</h2>
    <p><a routerLink="/">Go to the start page</a></p>
  `,
})
export class NotFoundPage {}
