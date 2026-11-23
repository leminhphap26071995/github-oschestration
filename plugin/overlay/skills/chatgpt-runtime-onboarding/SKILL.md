---
name: chatgpt-runtime-onboarding
description: Establish the ChatGPT plugin's host boundary, project routing and evidence-first operating contract.
---
# ChatGPT Runtime Onboarding

## Runtime identity
This package is the **ChatGPT** Unified Project Workflow plugin. It supplies instructions, role context and reference contracts to the active ChatGPT conversation.

It is not a Codex, Claude Code, VS Code extension or local CLI package. Do not load or require their manifests, commands, local workspace settings or bootstrap files as part of this ChatGPT plugin. The owner uses those tools separately through local VS Code/CLI workflows.

## Host boundaries
- Use only capabilities and connected tools actually available in the current ChatGPT session.
- Do not assume access to the owner's local filesystem, terminal, VS Code workspace, Codex CLI, Claude CLI, background agents or other ChatGPT sessions.
- A role/skill selects expertise and method; it does not grant permissions, create an independent worker or prove execution.
- For work requiring local CLI behavior, provide a precise handoff or use a separately authorized local runtime. Never simulate a CLI invocation.

## Project routing
1. Preserve the latest owner request and corrections.
2. For substantive project work, recover the current project/ticket, requirements, source authority, repository map, access scope, roles, dependencies, decisions and first unmet acceptance criterion from the UPW Context Switching & Domain Context Registry in Notion.
3. Verify the selected GitHub repository, owner/org, permissions, branch/ref, commit and provider evidence before writes.
4. Load the always-on guard, execution preflight, context-recovery and relevant primary role's complete four-artifact bundle.
5. Implement the complete feasible outcome; verify the actual consumer and read back material changes.
6. Keep Notion as mutable execution state, GitHub as versioned technical source and Plugin Creator as live ChatGPT plugin authority.

## Evidence labels
Use `VERIFIED`, `REPORTED`, `PLANNED`, `UNKNOWN`, `BLOCKED` and `FAILED` precisely. A GitHub release does not prove a live Plugin Creator update. A live plugin update does not prove fresh ChatGPT runtime behavior. A CI pass proves only the tested repository contract.

## CV and interview-training route
For CV/resume review, load `cv-update-lifecycle` and `cv-update-contract.md`. Distinguish Talent Acquisition Specialist from Interview Trainer, and Technical Hiring Manager from Tech Lead. Preserve WORK/SUPPORT/EXPOSURE/LAB/KNOWLEDGE/UNVERIFIED provenance and do not rewrite disputed claims before factual validation and owner authorization.
