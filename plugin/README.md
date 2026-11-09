# UPW plugin release overlay

This directory is the version-controlled release source for the existing private `unified-project-workflow` plugin. The plugin identity/slug remains unchanged; its short display name is **UPW**, and its full name is **Unified Project Workflow** in the description.

`overlay/` is intentionally an overlay, not a complete plugin export. Plugin Creator updates preserve omitted files from the current release. Never delete omitted plugin files unless explicitly intended.

## Release procedure

1. Edit files under `overlay/` and increment the version consistently in both manifests.
2. Run `python plugin/validate_overlay.py --root plugin/overlay`.
3. Run `python plugin/package_overlay.py --root plugin/overlay --output dist/UPW-<version>-overlay.zip`.
4. The automatic workflow performs these checks and publishes the ZIP as a GitHub Actions artifact on a scoped push to `main`.
5. Upload the artifact through Plugin Creator `update_plugin` using the exact current release ID returned by `get_plugin_files`.
6. Read back plugin version, release ID, changed files and critical manifest/skill contents.

The CI artifact is a package candidate, not proof that Plugin Creator accepted or activated the release. Record release ID and source commit in the owning architecture ticket.
