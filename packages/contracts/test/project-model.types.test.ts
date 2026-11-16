import { describe, expectTypeOf, it } from 'vitest';
import type { ModelChoice } from '../src/providers/index.js';
import type { ProjectModel } from '../src/project-store/index.js';

// Criterion 6: the model shape the Project store keeps in project.yaml is the ModelChoice that the providers API
// reads and writes. Vitest does not check types at run time; `npm run build` type-checks this file, so a mismatch
// fails the build.
describe('project model compatibility', () => {
  it('the project.yaml model type equals ModelChoice, in both directions', () => {
    expectTypeOf<ProjectModel>().toEqualTypeOf<ModelChoice>();
    expectTypeOf<ModelChoice>().toEqualTypeOf<ProjectModel>();
  });
});
