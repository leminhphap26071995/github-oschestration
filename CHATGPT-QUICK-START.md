# ChatGPT Quick Start — AM - AI Manager

This package is designed for the normal ChatGPT Chat experience. No Python, terminal, CLI, or separate application is required for the intended user flow.

## One-time setup

1. Download and extract the **AM - AI Manager Portable Workflow ZIP** into the root of your target GitHub repository.
2. If the repository already contains `AGENTS.md`, project instructions, workflow files, or checkpoints, inspect and merge them. Never replace existing project rules or current state blindly.
3. Activate/open the AM - AI Manager plugin in ChatGPT: https://chatgpt.com/plugins/plugins_6ad9fbd5c1d08191b8c4455e35588b1e
4. In ChatGPT Chat, attach the repository ZIP or provide the target repository URL if the plugin's current tool access cannot inspect it directly.

## Start a project

Send a short message, for example:

- `Start. Help me define the project I actually need.`
- `Help me improve this repository.`
- `Continue from the current checkpoint.`

AM first classifies the environment as EXISTING, EMPTY, or UNKNOWN. For an existing project it inspects live source-of-truth files and checkpoints before asking questions. For a genuinely new project, it interviews you **one question at a time**.

## Discovery and Introduction

AM asks only for missing critical information about the outcome, why it matters, deliverables, acceptance criteria, constraints, available sources, collaboration style, answer preferences, privacy, and approval boundaries. It then presents a concise goal charter for you to confirm or correct.

After confirmation, AM creates a copy-ready **Project Instructions / Introduction** draft below 8,000 characters. You must paste that draft into the ChatGPT Project settings yourself; the plugin cannot change host settings.

## Work and continuity

AM adapts the detailed workflow and domain packs to your target repository, then tracks acceptance criteria, evidence, failures, checkpoints, and the next action. When returning in a later session, use a short prompt such as `continue`; AM must re-read live state and resume at the first unmet criterion.

## Important boundaries

- The plugin source ZIP is a backup/development artifact; activate the hosted plugin through ChatGPT.
- The workflow ZIP is a set of portable repository files, not an autonomous background process.
- Tests and scripts are optional maintainer tools. They are not required for the intended ChatGPT flow.
- Never overwrite existing governance/checkpoints without inspecting and reconciling them.
- Host activation, connected-account permissions, real-world execution, and user acceptance are separate verification gates.
