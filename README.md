# @orchestrit/mini-me

Orchestr.it **Mini-me** is a small bootstrap CLI that installs a **workflow-driven Copilot agent** (and its workflow module) into an existing repository.

Instead of relying on free-form prompting, Mini-me encodes repeatable backend engineering outcomes as explicit **workflows** (a step-by-step playbook) executed under a strict runner contract.

## Quick start

From the root of the project you want to install into:

```bash
npx @orchestrit/mini-me install
```

That’s it. You should now have `.github/agents/mini-me-*.agent.md` and `.mini-me/` in your repo.

## Architecture (high level)

Mini-me is split into three layers:

- **Agent wrapper (tooling integration)**: Copilot agent entrypoints under `.github/agents/` (this package ships `.github/agents/mini-me-backend.agent.md`).
- **Persona + menu (what the agent is allowed to do)**: persona lives in `.mini-me/agents/` (backend persona: `.mini-me/agents/backend.md`).
- **Workflow system (how tasks are executed)**: runner contract in `.mini-me/core/`, workflows in `.mini-me/workflows/`, shared variables in `.mini-me/config.yaml`.

The wrapper stays thin; the persona stays stable; workflows evolve over time as your standards change.

## What gets installed

Running the installer will create/update these paths in your target project:

- `.github/agents/mini-me-*.agent.md`
  - GitHub Copilot “agent” entrypoints (Markdown-based) that activate the Mini-me personas.
- `.mini-me/`
  - The Mini-me module folder (agents, core, workflows, config).

Notes:

- The installer **overwrites** the target project’s `.mini-me/` folder (it uses a recursive copy with `force: true`).
- Agent files are copied individually into `.github/agents/`.

## Prerequisites

- Node.js **18+** (recommended: latest LTS)
- A project/repository where you want to install Mini-me

## What’s inside `.mini-me/`

- `.mini-me/config.yaml`
  - A small config file used for workflow variables (name, languages, output folder, etc.).
- `.mini-me/agents/`
  - Persona definitions. The backend persona is `.mini-me/agents/backend.md`.
- `.mini-me/workflows/`
  - Workflow documents the persona can run.
  - This package currently includes:
    - `.mini-me/workflows/create-fastify/`
    - `.mini-me/workflows/add-endpoint-from-docs/`

## Usage

## After install (Copilot usage)

Once installed into your target repo, you can drive Mini-me from GitHub Copilot Chat using the provided agent.

1. Open **Copilot Chat** in VS Code.
2. Select the **Mini-me Backend agent** (installed as an agent entry under `.github/agents/mini-me-backend.agent.md`).
3. Run `*menu` to verify the agent is active and to display the available commands.

The command menu is defined by the backend persona in `.mini-me/agents/backend.md`.

### Commands

- `*create-fastify`
  - Runs the “Create a fastify backend service” workflow from `.mini-me/workflows/create-fastify/workflow.md`.
- `*add-endpoint-from-docs`
  - Runs the “Add endpoint from docs” workflow from `.mini-me/workflows/add-endpoint-from-docs/workflow.md`.

Re-run install (idempotent):

```bash
npx @orchestrit/mini-me install
```

## Uninstall

If you want to remove Mini-me from a project, delete the installed files/folders:

- `.github/agents/mini-me-*.agent.md`
- `.mini-me/`

## Development

Run the CLI directly from this repo:

```bash
node ./cli.js install
```

## License

MIT
