import { spawn } from 'node:child_process';
import { mkdtemp, rm, stat, unlink } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { COMPILE_ERROR_STATUS } from '@bbartolome/scriba-contracts/compile-export';
import { ModuleError } from '../platform/platform.module';
import type { PandocTuning } from './export-tuning';

// The formats that Pandoc renders. md is assembled without Pandoc.
export type PandocFormat = 'docx' | 'epub' | 'pdf';

// The target arguments of each format.
// PDF is rendered by Typst, and Pandoc writes a PDF only when the output name ends in .pdf.
// Target flags are in PANDOC_TARGET_ARGS; a flag that takes a file per run is in PANDOC_FILE_FLAGS.
export const PANDOC_TARGET_ARGS: Record<PandocFormat, string[]> = {
  docx: ['--to=docx'],
  epub: ['--to=epub3', '--split-level=1', '--toc'],
  pdf: ['--to=typst', '--pdf-engine=typst'],
};

// The flag that takes a file for each format, per run (the reference DOCX, a stylesheet, a template). The file is
// the built-in one or a project override, so it cannot be a constant. A format with no entry takes no file.
export const PANDOC_FILE_FLAGS: Partial<Record<PandocFormat, string>> = {
  docx: '--reference-doc',
  epub: '--css',
  pdf: '--template',
};

// Why a Pandoc run failed. Each reason has its fixed message.
export type PandocFailureReason =
  'exit' | 'not-started' | 'no-output' | 'output-too-large';

const REASON_TEXT: Record<PandocFailureReason, string> = {
  exit: 'Pandoc failed.',
  'not-started': 'Pandoc could not start.',
  'no-output': 'Pandoc wrote no output.',
  'output-too-large': 'The Pandoc output is larger than the limit.',
};

const TIMEOUT_MESSAGE = 'Pandoc did not finish in time.';

// The outcome of one child process that started.
interface ChildResult {
  code: number | null;
  timedOut: boolean;
  stderrTail: string;
}

// A failed Pandoc run: the reason's text, then the stderr tail when there is one (D8).
function failure(
  reason: PandocFailureReason,
  exitCode: number | null,
  stderrTail: string,
): ModuleError {
  const text = REASON_TEXT[reason];
  const message = stderrTail === '' ? text : `${text} ${stderrTail}`;
  return new ModuleError(
    'COMPILE_PANDOC_FAILED',
    COMPILE_ERROR_STATUS.COMPILE_PANDOC_FAILED,
    message,
    { reason, exitCode, stderrTail },
  );
}

// Runs the command with an argument array and no shell, in `workdir`. The Markdown goes to stdin. The timer kills
// the child with SIGKILL and the promise settles only at `close`. A spawn error rejects with `not-started`.
function runChild(
  tuning: PandocTuning,
  args: string[],
  markdown: string,
  workdir: string,
): Promise<ChildResult> {
  return new Promise((resolve, reject) => {
    const child = spawn(tuning.command, args, {
      cwd: workdir,
      shell: false,
      stdio: 'pipe',
      windowsHide: true,
    });
    let tail = Buffer.alloc(0);
    let timedOut = false;
    child.stdout.resume();
    child.stderr.on('data', (chunk: Buffer) => {
      tail = Buffer.concat([tail, chunk]);
      if (tail.length > tuning.stderrMaxBytes) {
        tail = tail.subarray(tail.length - tuning.stderrMaxBytes);
      }
    });
    // A child that exits early closes its stdin. The write error is then not a result, so it is ignored (D4).
    child.stdin.on('error', () => undefined);
    child.stdin.end(markdown);
    const timer = setTimeout(() => {
      timedOut = true;
      child.kill('SIGKILL');
    }, tuning.timeoutMs);
    child.on('error', () => {
      clearTimeout(timer);
      reject(failure('not-started', null, ''));
    });
    child.on('close', (code) => {
      clearTimeout(timer);
      resolve({
        code,
        timedOut,
        stderrTail: tail.toString('utf8').trim(),
      });
    });
  });
}

// Runs Pandoc for one format and writes the output to `outputPath`, an absolute path in the exports folder. The
// child's working directory is a temp folder, because Pandoc writes PDF media into the current directory (P1).
// Resolves with the warnings: the non-empty lines of stderr. Every failure is COMPILE_PANDOC_FAILED or the timeout.
// `file`, when set, is passed through the format's flag in PANDOC_FILE_FLAGS; a format without one rejects it.
export async function runPandoc(
  tuning: PandocTuning,
  format: PandocFormat,
  markdown: string,
  root: string,
  outputPath: string,
  file?: string,
): Promise<string[]> {
  const workdir = await mkdtemp(join(tmpdir(), 'scriba-pandoc-'));
  try {
    const fileArgs: string[] = [];
    if (file !== undefined) {
      const flag = PANDOC_FILE_FLAGS[format];
      if (flag === undefined) {
        throw new Error(`Pandoc format ${format} takes no file.`);
      }
      fileArgs.push(`${flag}=${file}`);
    }
    const args = [
      '--from=markdown',
      ...PANDOC_TARGET_ARGS[format],
      ...fileArgs,
      `--resource-path=${root}`,
      `--output=${outputPath}`,
    ];
    const child = await runChild(tuning, args, markdown, workdir);
    if (child.timedOut) {
      throw new ModuleError(
        'COMPILE_PANDOC_TIMEOUT',
        COMPILE_ERROR_STATUS.COMPILE_PANDOC_TIMEOUT,
        TIMEOUT_MESSAGE,
      );
    }
    if (child.code !== 0) {
      throw failure('exit', child.code, child.stderrTail);
    }
    const size = await stat(outputPath)
      .then((info) => (info.isFile() ? info.size : undefined))
      .catch(() => undefined);
    if (size === undefined) {
      throw failure('no-output', 0, child.stderrTail);
    }
    if (size > tuning.outputMaxBytes) {
      await unlink(outputPath);
      throw failure('output-too-large', 0, child.stderrTail);
    }
    return child.stderrTail
      .split('\n')
      .map((line) => line.trim())
      .filter((line) => line !== '');
  } finally {
    await rm(workdir, { recursive: true, force: true });
  }
}
