# Manual eval of the Agent loop

`run.mjs` runs the Agent loop against a real local model, over a set of cases. It writes a report of the failure modes the retries handled (malformed calls, withdrawals, step caps), the citation presence, and each outcome. It is a manual check. It is **not part of CI**, and `npm test` does not run it.

## Run it

Start a local model server on the host (for example Ollama, with a model that accepts tool calls), then run:

```sh
npm run eval:agent -- --model <small-model> --model <larger-model>
```

Options:

- `--model <name>`: required, repeatable. Each model gets its own provider in a temporary library. No model name is built into the script.
- `--base-url <url>`: an OpenAI-compatible endpoint. The default is `http://127.0.0.1:11434/v1`, which is Ollama on the host.
- `--case <id>`: repeatable. Runs only these cases. The default is every case file.
- `--cases-dir <dir>`: the folder of case files. The default is `scripts/eval-agent/cases`.
- `--reports-dir <dir>`: where reports go. The default is `eval-reports` at the repository root, which is git-ignored.

The command first builds contracts and the API, then boots the API on port 8080. Port 8080 must be free. If it is in use, the script exits with code 2.

## What a run does

For each model and each case, the script:

1. Creates a fresh project from the case's sample in a temporary library.
2. Makes it the active project and sends the intent to the agent loop.
3. Waits for the run to end. A run that passes 10 minutes is stopped.

When every pair is done, the script stops the API and deletes the library's `.scriba/` folder, which holds the settings, the token and the setup URL. The project folders stay, with their `logs/agent-runs/` transcripts, so you can read them.

## Cases

A case is one JSON file in `cases/`. Adding a case is one file and no code change: create the file, then run it with `--case <id>`, or run every case. The case id is the file name without `.json`. It must match `^[a-z0-9][a-z0-9-]*$`.

```json
{
  "sample": "nonfiction",
  "intent": "summarize my outline",
  "expect": {
    "reason": "completed",
    "tools": ["list_files", "read_file"],
    "citations": "any"
  }
}
```

Keys:

- `sample`: the id of a sample project in `examples/samples.yaml`. Required.
- `intent`: the text sent to the agent. Required.
- `expect`: what to check. Required, and it may be `{}`. Each key below is optional. A key that is left out is reported as `unchecked`.
  - `reason`: the run-end reason the run must have. One of `completed`, `stopped`, `capped`, `error`, `project-switched`.
  - `tools`: tool names. Each must appear on a card with status `done`.
  - `citations`: `present` (at least one `[@id]`), `absent` (none), or `any`.

A file with an unknown key, or a bad value, exits with code 2 and names the file.

## The report

Each run writes `eval-reports/<stamp>/report.json`. The stamp is the UTC time, `yyyymmddThhmmssZ`. The projects of the run are in `eval-reports/<stamp>/library/`.

The report has `schemaVersion: 1`, `startedAt`, `finishedAt`, `baseUrl`, `library`, and `results`. Each result has:

- `case`, `model`, `runId`, `conversationId`.
- `reason`: the run-end reason, or `null` when there is no turn.
- `assistantText`: the answer text.
- `citations`: the count of `[@id]` matches, in the answer and in the cards.
- `citationIds`: the distinct ids, in first-seen order.
- `cards`: the tool-call cards, copied unchanged from the turn. A draft written by `write_file` is in a card's `arguments`.
- `failureModes`: `malformedCalls`, `withdrawals`, `stepCapped`.
- `expect`: the outcome of `reason`, `tools` and `citations`. Each is `pass`, `fail` or `unchecked`.
- `error`: a message, or `null`.

The script checks citation presence only. It does not check whether an id is valid. To check that, compare `citationIds` with each card's `arguments` and `sourcesUsed`.

`error` is set only when the script could not get a turn. That happens when a step answers with an unexpected status, or when the 10 minute limit is reached. A run that ends with `error`, `capped` or `stopped` has `error: null`, and its outcome is in `reason`. A result with an error fails every expectation the case sets.

## Exit codes

- `0`: the report is written, and every result has `error: null`.
- `1`: a result has an `error`, or the API did not start. No report is written in that case.
- `2`: a usage error, an invalid case file, an unknown `--case`, or port 8080 in use.

A failed expectation does not change the exit code.

## Tests

`run.test.mjs` runs the script against the mock OpenAI server, with the `summarize-outline` scenario, and a booted API. Build contracts and the API first:

```sh
npm run build -w @bbartolome/scriba-contracts && npm run build -w @bbartolome/scriba-api
node --test scripts/eval-agent/run.test.mjs
```

Like the script, the tests are not run by `npm test`.
