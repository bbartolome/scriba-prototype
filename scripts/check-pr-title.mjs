// Checks that a pull request title is a Conventional Commit header.
// The title arrives only through the PR_TITLE environment variable, never inside a run: line.
const pattern =
  /^(build|chore|ci|docs|feat|fix|perf|refactor|revert|style|test)(\([A-Za-z0-9._-]+\))?!?: \S.*$/;

const title = process.env.PR_TITLE ?? '';

if (pattern.test(title)) {
  process.exit(0);
}

process.stderr.write(
  `PR title is not a Conventional Commit header: ${JSON.stringify(title)}\n` +
    'Expected <type>(<scope>)?: <description>, where type is one of build, chore, ci, docs, feat, fix, perf, refactor, revert, style, test.\n',
);
process.exit(1);
