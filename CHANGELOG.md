# Changelog

## 0.8.0

- Add `ts` argument to `Resource.$load` and `Resource.$loadPaths`.

## 0.7.6

- Use `Resource.$merge` in `Context.httpPatch`. (Sergiy Pereverziev)

## 0.7.5

- Fix tests.

## 0.7.4

- Fix `package.json` for use as an npm module.

## 0.7.3

- Annotate vnd.error module dependency injection. (Nikolay Gerzhan)

## 0.7.2

- Fix bug in `Resource.$update` when using another resource object.

## 0.7.1

- Build distribution. (Last release had old files in dist.)

## 0.7.0

- Add extra properties in vnd.error objects.

## 0.6.0

- Add Context.refresh.

## 0.5.0

- Add `Resource.$isSynced`.

## 0.4.3

- Do not remove properties starting with '$$' in $update.

## 0.4.2

- Fix `BlobResource`.

## 0.4.1

- Fix vnd.error media type.

## 0.4.0

- Add support for error handlers.

## 0.3.0

- Add self link to `Resource`.
- Log non-existent paths in `Resource.$loadPaths`.
- Fix `Resource.$patch`.

## 0.2.1

- Fix bug with `HalResource` subclasses in embedded resources.

## 0.2.0

- Add support for the PATCH method using JSON Merge Patch.
- Add jshint.
- Add jscs.

## 0.1.2

- Build distribution. (Last release had old files in dist.)

## 0.1.1

- Fix bug in profile setter.
- Add tests.

## 0.1.0

Initial release.
