# Plugin Release Packaging

## Scope and ownership

The canonical plugin release source is maintained under `plugin/overlay/`. It contains a versioned overlay for the existing UPW plugin identity. It is not a second plugin and does not replace the Plugin Creator backend as the release authority.

## Automatic CI

`.github/workflows/update-upw-plugin.yml` runs on a push to `main` that changes the owner-approved update request file. It runs only when an owner-approved `.github/upw-plugin-update-request.json` is committed to `main`. It validates the exact UPW Plugin Creator ID, expected current release ID and current live version, then requires the overlay version to be newer and both manifests to preserve the current default prompt. It validates the overlay, creates a ZIP whose root is the plugin root, checks ZIP integrity, computes SHA-256, records source/release provenance and uploads a short-lived handoff artifact. No `workflow_dispatch` is added.

The ZIP is an overlay: omitted files are retained by Plugin Creator's update operation. This avoids storing a duplicate full plugin archive in the repository.

## Create/update handoff

1. Read the live UPW plugin metadata and files through Plugin Creator; record its exact plugin ID, current version and current release ID.
2. Refresh the repository overlay from the intended current plugin source; preserve plugin identity, default prompts, omitted files, audience and scope.
3. Set `.github/upw-plugin-update-request.json` with owner approval, exact plugin ID, expected current release ID and current version. Commit it to `main` with `[upw-plugin-update]` in the commit message; both the changed request path and this explicit marker are required to run the preparation job.
4. Verify artifact source SHA, ZIP integrity, SHA-256 and handoff metadata. The workflow rejects an overlay version that is not newer than the recorded live version or whose manifests do not preserve the default prompt.
5. Use the native Plugin Creator update action with the exact plugin ID and expected release ID. GitHub Actions cannot invoke that Plugin Creator mutation.
6. Read back the new release ID/version and every changed file; record the release ID and source SHA in the owning project/ticket checkpoint.

**Boundary:** GitHub Actions can validate and package the plugin but cannot invoke the current ChatGPT Plugin Creator action. The actual create/update remains a separate Plugin Creator operation after artifact review. A green packaging workflow does not prove plugin update, host activation or actual skill invocation.
