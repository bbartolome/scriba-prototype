import { inject } from '@angular/core';
import { type CanActivateFn, Router } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { remainderOf } from './project-scope';
import { ACTIVE_PROJECT_PATH, activeProjectCopy } from './project-store-copies';
import { API_CLIENT } from './tokens';

/**
 * Guards `projects/:projectId`. The URL's project must be the server's active one. Otherwise the
 * navigation goes to the switch page, with the rest of the URL in its `to` query. A failed read
 * cancels the navigation.
 */
export const activeProjectGuard: CanActivateFn = async (route, state) => {
  const api = inject(API_CLIENT);
  const router = inject(Router);
  const projectId = route.paramMap.get('projectId') ?? '';

  let active: string | null;
  try {
    const answer = await firstValueFrom(
      api.get(ACTIVE_PROJECT_PATH, activeProjectCopy),
    );
    active = answer.active;
  } catch {
    return false;
  }
  if (active === projectId) {
    return true;
  }
  return router.createUrlTree(['/projects', projectId, 'switch'], {
    queryParams: { to: remainderOf(state.url) ?? '' },
  });
};
