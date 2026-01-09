# @randajan/google-drive

[![NPM](https://img.shields.io/npm/v/@randajan/google-drive.svg)](https://www.npmjs.com/package/@randajan/google-drive)
[![JavaScript Style Guide](https://img.shields.io/badge/code_style-standard-brightgreen.svg)](https://standardjs.com)

Minimal promise-based toolkit that makes the Google Drive API feel like a local filesystem.

## Vision

- Path-first API: work with `folder/sub/file.txt` instead of IDs
- Batteries included: read/write/move/sync helpers
- Zero boilerplate: wraps the official googleapis client

## Exports

The package exposes two main entry points:
- `@randajan/google-drive` (Drive wrapper)
- `@randajan/google-drive/sync` (sync service)

## Drive API (`@randajan/google-drive`)

### Constructor

```js
new GoogleDrive({ auth, rootId, defaultFields })
```

- `auth` (required): googleapis OAuth2 client or auth instance
- `rootId` (required): Drive folder id used as the root for path-based access
- `defaultFields` (optional): extra fields to include in every API call

### Methods

- `ping(throwError = true)`  
  Checks credentials and returns HTTP status; throws if `throwError`.
- `getById(fileId, fields = [])`  
  Fetches metadata by Drive file id.
- `getFile(relPath, fields = [])`  
  Resolves a file by path under `rootId` and returns metadata.
- `getFolder(relPath, fields = [])`  
  Resolves a folder by path under `rootId` and returns metadata.
- `readFileById(fileId, stream = true, fields = [])`  
  Reads file content by id. Adds `content` (stream or buffer) to the result.
- `readFile(relPath, stream = true, fields = [])`  
  Reads file content by path. Adds `content` to the result.
- `updateFileById(fileId, content, mimeType = "text/plain", fields = [])`  
  Updates file content by id.
- `updateFile(relPath, content, mimeType = "text/plain", fields = [])`  
  Updates file content by path.
- `createFile(relPath, content, mimeType = "text/plain", fields = [])`  
  Creates a new file by path.
- `ensureFile(relPath, content, mimeType = "text/plain", fields = [])`  
  Creates or updates a file by path.
- `createFolder(parentId, name, fields = [])`  
  Creates a Drive folder under `parentId` (or under `rootId` if `parentId` is falsy).
- `deleteById(fileId)`  
  Deletes a file or folder by id.
- `deleteFile(relPath)`  
  Deletes a file by path.
- `deleteFolder(relPath)`  
  Deletes a folder by path.
- `map(parentId, callback, fields = [])`  
  Traverses files in a folder and calls `callback` for each file.
- `createRootFolder(name, fields = [])`  
  Shortcut for creating a folder under `rootId`.
- `mapRoot(callback, fields = [])`  
  Shortcut for `map(rootId, ...)`.
- `isFile(any)`, `isFolder(any)`, `isNativeFile(any)`  
  Type helpers for Drive items.

## Sync API (`@randajan/google-drive/sync`)

The sync layer keeps a local folder and a remote Drive folder aligned. It supports:
- `MERGE`: auto-sync by timestamps
- `PULL`: remote is authoritative (mirror)
- `PUSH`: local is authoritative (mirror)

### Constructor

```js
new GoogleDriveSync({
  auth,
  remoteRootId,
  localRootPath,
  mode,
  onMissing,
  caseSensitive,
  logger
})
```

- `auth` (required): same as `GoogleDrive`
- `remoteRootId` (required): Drive folder id to sync
- `localRootPath` (required): local folder path to sync
- `mode` (`MERGE` | `PULL` | `PUSH`, default `MERGE`)
- `onMissing` (function, see below)
- `caseSensitive` (default false): path de-duplication sensitivity on local
- `logger` (function, default no-op): `logger(label, relPath)`

### Methods

- `sync(loggerOnce)`  
  Scans both sides and applies the sync decision tree.
- `pull(relPath, loggerOnce)`  
  Force one file to be pulled from remote to local.
  If file not exist on remote the local file will be removed.
- `push(relPath, loggerOnce)`  
  Force one file to be pushed from local to remote.
  If file not exist on local the remote file will be removed.
- `remove(relPath, loggerOnce)`  
  Force removal on both sides.

### onMissing()

`onMissing(rec, info)` is called when a file existed in the DB, but is missing
on one side. It is evaluated only when the resolved mode is `MERGE`.

Return one of:
- `"revive"`: restore the missing side from the existing one
- `"remove"`: delete both sides
- `"wait"`: do nothing (tombstone behavior)

Default behavior (if you keep the built-in callback):
- wait until `missingCount` reaches 3, then return `"remove"`

`rec` includes:
- `missingSide` (`local` or `remote`)
- `missingCount` (incremented per missing detection)

`info` includes:
- `relPath`, `local`, `remote`, `force`

### Debug messages

`logger(label, relPath)` receives a short action label. Common labels:
- `Sweep` (neither side exists)
- `Ok` (timestamps match, no action)
- `Pull new` / `Push new` - new file in database
- `Pull revive` / `Push revive` - file revived from other side
- `Pull update` / `Push update` - file override with newer version
- `Pull overwrite` / `Push overwrite` - file override with older version
- `Pull remove` / `Push remove` - file removed
- `Missing local` / `Missing remote` - file is missing on one side

## License

MIT (c) randajan
