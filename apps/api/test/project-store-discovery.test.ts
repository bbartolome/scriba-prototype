import { realpathSync } from 'node:fs';
import { expect, it } from 'vitest';
import {
  buildProjectsLibrary,
  getProjects,
  listedProjects,
  withProjectsApp,
} from './project-store-projects.kit';
import { snapshotLibrary } from './invariant-sweep';

it('C1: does not recurse into nested folders; the list has the non-dot immediate subfolders, marks importable ones, and skips dot-folders and outward links', async () => {
  const fixture = buildProjectsLibrary();
  try {
    await withProjectsApp(fixture, async (app, cookie) => {
      const reply = await getProjects(app, cookie);
      expect(reply.status).toBe(200);
      const statuses = Object.fromEntries(
        listedProjects(reply).map((project) => [project.id, project.status]),
      );
      expect(statuses).toEqual({
        bad: 'invalid',
        bare: 'importable',
        book: 'ok',
        broken: 'invalid',
        'draft-only': 'importable',
        'gi-done': 'importable',
        later: 'too-new',
        'link-in': 'ok',
        nested: 'importable',
      });
      expect(reply.body).not.toContain(fixture.library);
      expect(reply.body).not.toContain(realpathSync(fixture.library));
    });
  } finally {
    fixture.remove();
  }
});

it('C2: invalid and too-new entries carry their issue, and a newer schemaVersion wins over other faults', async () => {
  const fixture = buildProjectsLibrary();
  try {
    await withProjectsApp(fixture, async (app, cookie) => {
      const reply = await getProjects(app, cookie);
      const byId = new Map(
        listedProjects(reply).map((project) => [project.id, project]),
      );
      expect(byId.get('bad')?.error).toBe(
        'title: Invalid input: expected string, received undefined',
      );
      const broken = byId.get('broken')?.error ?? '';
      expect(broken.length).toBeGreaterThan(0);
      expect(broken).not.toContain('\n');
      const later = byId.get('later');
      expect(later?.status).toBe('too-new');
      expect(later).not.toHaveProperty('error');
    });
  } finally {
    fixture.remove();
  }
});

it('C5: the list GET is side-effect free', async () => {
  const fixture = buildProjectsLibrary();
  try {
    await withProjectsApp(fixture, async (app, cookie) => {
      const before = snapshotLibrary(fixture.library);
      const first = await getProjects(app, cookie);
      expect(first.status).toBe(200);
      const after = snapshotLibrary(fixture.library);
      expect(after).toEqual(before);
      const second = await getProjects(app, cookie);
      expect(second.body).toBe(first.body);
    });
  } finally {
    fixture.remove();
  }
});

it('E3: the active project is marked whatever its status, from the projects section', async () => {
  const fixture = buildProjectsLibrary({
    settings:
      'schemaVersion: 1\nprojects:\n  schemaVersion: 1\n  active: bad\n',
  });
  try {
    await withProjectsApp(fixture, async (app, cookie) => {
      const reply = await getProjects(app, cookie);
      const projects = listedProjects(reply);
      expect(
        projects
          .filter((project) => project.active)
          .map((project) => project.id),
      ).toEqual(['bad']);
      expect(projects.find((project) => project.id === 'bad')?.status).toBe(
        'invalid',
      );
    });
  } finally {
    fixture.remove();
  }
});
