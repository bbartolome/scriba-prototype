// semantic-release plugin for PLT-19 (PLT-19 plan, D4).
// In the plan job it records the version a dry run would release, for scripts/publish-plan.sh.
// In the release job it refuses a release whose version differs from the version already
// built into the image, before any tag exists.
import { writeFileSync } from 'node:fs';

export function verifyRelease(pluginConfig, context) {
  const version = context.nextRelease.version;
  const expected = process.env.SCRIBA_EXPECT_VERSION;
  if (expected && expected !== version) {
    throw new Error(
      `release-guard: the next release is ${version}, but the image was built for ${expected}; no tag was created`,
    );
  }
  const out = process.env.SCRIBA_PLAN_OUT;
  if (out) {
    writeFileSync(out, `${version}\n`);
  }
}
