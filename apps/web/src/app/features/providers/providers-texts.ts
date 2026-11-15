// Every visible string of the providers panel. The specs assert the literal strings, so no spec
// imports this file.

const MASK = '\u2022\u2022\u2022\u2022';
const MIDDLE_DOT = '\u00b7';

/** The masked key: four bullets and the hint. Used only when a hint exists. */
export function maskedKey(hint: string): string {
  return `${MASK}${hint}`;
}

export const TEXTS = {
  heading: 'Providers',
  listLabel: 'Providers',
  loading: 'Loading providers...',
  loadProvidersFailed: 'The providers could not be loaded.',
  loadPresetsFailed: 'The presets could not be loaded.',
  loadDefaultFailed: 'The app default could not be loaded.',
  tryAgain: 'Try again',
  addHeading: 'Add a provider',
  customUrl: 'Custom URL',
  addCustom: 'Add a custom provider',
  addPresetHeading: (label: string): string => `Add ${label}`,
  editHeading: (id: string): string => `Edit ${id}`,
  appDefaultLabel: 'App default',
  noDefault: 'No default',
  defaultBadge: 'Default',
  providerOption: (id: string, model: string): string =>
    `${id} ${MIDDLE_DOT} ${model}`,
  edit: 'Edit',
  deleteButton: 'Delete',
  confirmDelete: 'Confirm delete',
  cancel: 'Cancel',
  deletePrompt: (id: string): string => `Delete ${id}? Its key is deleted too.`,
  deleteInUse: 'Pick another default first.',
  deleteNotFound: 'That provider no longer exists. The list was reloaded.',
  genericFailure: 'The request failed. Try again.',
  keySet: 'Key set',
  noKey: 'No key set',
  replace: 'Replace',
  removeKey: 'Remove',
  keyLabel: 'API key',
  keyRequired: 'This provider needs an API key.',
  keySaveFailed:
    'The provider was saved, but its key was not saved. Paste the key again and press Save.',
  saved: 'Saved.',
  save: 'Save',
  close: 'Close',
  automatic: "Automatic (the provider's first listed model)",
  notListed: (model: string): string => `${model} (not listed)`,
  loadingModels: 'Loading models...',
  modelLabel: 'Model',
  modelUnsaved:
    'Save the provider to load its model list. Until then, type the model name.',
  modelEmpty: 'The provider listed no models. Type the model name instead.',
  modelFailed:
    'The model list could not be loaded. Type the model name instead.',
  nameLabel: 'Name',
  nameInvalid: 'Enter a name with a letter or digit.',
  baseUrlLabel: 'Base URL',
  urlInvalid: 'Enter a full URL, for example http://localhost:9000/v1.',
  temperatureLabel: 'Temperature',
  numberInvalid: 'Enter a number.',
  contextLabel: 'Context length (tokens)',
  contextHint:
    "The model's context length in tokens. Scriba uses it to budget a prompt; it is not sent to the provider.",
  maxTokensLabel: 'Max tokens',
  timeoutLabel: 'Timeout (ms)',
  timeoutHint:
    'Milliseconds. 0 means 300000 (5 minutes), not no limit. A wait with no data also ends after 300000 even if you set more.',
  retriesLabel: 'Retries',
  wholeAtLeastOne: 'Enter a whole number of at least 1.',
  wholeAtLeastZero: 'Enter a whole number of at least 0.',
  testConnection: 'Test connection',
  testing: 'Testing the connection...',
  testSavedNote:
    'The test uses the saved settings. Save your changes first to test them.',
  testHeading: 'Connection test',
  testPassed: 'The connection test passed.',
  stageReach: 'Reach the server',
  stageList: 'List the models',
  stageChat: 'Send a test message',
  statePassed: 'passed',
  stateFailed: 'failed',
  stateNotRun: 'not run',
  latency: (ms: number): string => `Latency ${ms} ms`,
  modelCount: (count: number): string =>
    count === 1 ? '1 model listed.' : `${count} models listed.`,
} as const;
