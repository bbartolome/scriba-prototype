// Constants of the project-store slice.

// Entity IDs: lowercase letters, digits and hyphens, starting with a letter or digit.
export const ENTITY_ID_PATTERN = /^[a-z0-9][a-z0-9-]*$/;

// An in-body citation: [@id] or [@id1; @id2]. Unanchored and without the g flag, so a scanner adds g itself.
export const CITATION_PATTERN =
  /\[@[a-z0-9][a-z0-9-]*(?:; @[a-z0-9][a-z0-9-]*)*\]/;

// A content hash: sha256: followed by 64 lowercase hex digits, of the file's UTF-8 bytes.
export const CONTENT_HASH_PATTERN = /^sha256:[0-9a-f]{64}$/;

// The folder name of a new project or a project started from a sample.
export const PROJECT_FOLDER_NAME_PATTERN = /^[a-z0-9][a-z0-9-]*$/;

// Path prefixes the store keeps for itself: its metadata folder and the draft version folder.
export const RESERVED_PATH_PREFIXES = [
  '.scriba/',
  'drafts/.versions/',
] as const;

// The largest text file the file API reads or writes: 5 MiB in bytes.
export const FILE_SIZE_CAP_BYTES = 5 * 1024 * 1024;

// The genre pack a new project gets when its request names none.
export const DEFAULT_GENRE_PACK = 'nonfiction';
