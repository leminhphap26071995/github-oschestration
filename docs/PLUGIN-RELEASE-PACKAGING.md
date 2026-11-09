# Plugin Release Packaging

## Scope and ownership

The canonical plugin release source is maintained under `plugin/overlay/`. It contains a versioned overlay for the existing UPW plugin identity. It is not a second plugin and does not replace the Plugin Creator backend as the release authority.

## Automatic CI

`.github/workflows/package-upw-plugin.yml` runs on pushes to `main` that change plugin source or its relevant contracts. It validates both manifests and required contract files, creates a ZIP whose root is the plugin root, checks ZIP integrity, computes SHA-256 and uploads the versioned overlay as a workflow artifact. No `workflow_dispatch` is added.

The ZIP is an overlay: omitted files are retained by Plugin Creator's update operation. This avoids storing a duplicate full plugin archive in the repository.

## Create/update handoff

1. Confirm artifact source SHA, ZIP integrity and SHA-256.
2. Confirm whether the plugin identity already exists. Create only if it does not; otherwise update the existing plugin.
3. For an update, read the current plugin ID and current release ID from Plugin Creator.
4. Upload the artifact with the expected current release ID.
5. Verify the returned version/release ID and read back changed files.
6. Record release ID and source SHA in the owning project/ticket checkpoint.

**Boundary:** GitHub Actions can validate and package the plugin but cannot invoke the current ChatGPT Plugin Creator action. The actual create/update remains a separate Plugin Creator operation after artifact review. A green packaging workflow does not prove plugin update, host activation or actual skill invocation.
