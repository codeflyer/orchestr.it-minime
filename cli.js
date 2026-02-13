#!/usr/bin/env node

const [, , command, ...args] = process.argv;

import { existsSync, statSync } from 'node:fs';
import { mkdir, readdir, copyFile, cp } from 'node:fs/promises';
import path from 'node:path';
import { stdin as input, stdout as output } from 'node:process';
import { fileURLToPath } from 'node:url';

const TARGETS = {
  copilot: 'copilot',
  cursor: 'cursor',
};

function isDirectory(maybePath) {
  try {
    return statSync(maybePath).isDirectory();
  } catch {
    return false;
  }
}

function getPackageRootDir() {
  // cli.js lives at the npm package root.
  return path.dirname(fileURLToPath(import.meta.url));
}

function parseInstallOptions(installArgs) {
  const selectedTargets = new Set();
  let nonInteractive = false;

  for (let i = 0; i < installArgs.length; i += 1) {
    const arg = installArgs[i];

    if (arg === '--yes' || arg === '-y') {
      nonInteractive = true;
      continue;
    }

    if (arg === '--target' || arg === '-t') {
      const value = installArgs[i + 1];
      i += 1;
      if (!value) {
        console.error('[mini-me] Missing value for --target option.');
        process.exit(1);
      }

      value
        .split(',')
        .map((x) => x.trim().toLowerCase())
        .filter(Boolean)
        .forEach((target) => selectedTargets.add(target));

      continue;
    }

    if (arg.startsWith('--target=')) {
      arg
        .slice('--target='.length)
        .split(',')
        .map((x) => x.trim().toLowerCase())
        .filter(Boolean)
        .forEach((target) => selectedTargets.add(target));
      continue;
    }

    console.error(`[mini-me] Unknown install option: ${arg}`);
    process.exit(1);
  }

  return {
    selectedTargets,
    nonInteractive,
  };
}

function normalizeTargets(rawTargets) {
  const normalized = new Set();

  for (const target of rawTargets) {
    if (target === TARGETS.copilot || target === TARGETS.cursor) {
      normalized.add(target);
      continue;
    }

    console.error(`[mini-me] Unsupported target: ${target}`);
    process.exit(1);
  }

  return normalized;
}

async function promptTargetChecklist() {
  const options = [
    { label: 'Copilot', value: TARGETS.copilot, selected: true },
    { label: 'Cursor', value: TARGETS.cursor, selected: false },
  ];

  let activeIndex = 0;
  let renderedLines = 0;

  function render(message = '') {
    if (renderedLines > 0) {
      output.write(`\x1b[${renderedLines}A`);
      output.write('\x1b[J');
    }

    const lines = [
      'Select installation targets (use ↑/↓ to move, Space to toggle, Enter to confirm):',
      ...options.map((option, index) => {
        const pointer = index === activeIndex ? '❯' : ' ';
        const mark = option.selected ? 'x' : ' ';
        return `${pointer} [${mark}] ${option.label}`;
      }),
    ];

    if (message) {
      lines.push(message);
    }

    output.write(`${lines.join('\n')}\n`);
    renderedLines = lines.length;
  }

  return new Promise((resolve, reject) => {
    const restoreRawMode = typeof input.setRawMode === 'function' ? input.isRaw : undefined;

    const cleanup = () => {
      input.removeListener('data', onData);
      if (typeof input.setRawMode === 'function') {
        input.setRawMode(Boolean(restoreRawMode));
      }
      input.pause();
      output.write('\x1b[?25h');
      output.write('\n');
    };

    const finish = () => {
      const selected = new Set(options.filter((option) => option.selected).map((option) => option.value));
      cleanup();
      resolve(selected);
    };

    const onData = (chunk) => {
      const key = String(chunk);

      if (key === '\u0003') {
        cleanup();
        reject(new Error('Interrupted by user'));
        return;
      }

      if (key === '\r' || key === '\n') {
        const selectedCount = options.filter((option) => option.selected).length;
        if (selectedCount === 0) {
          render('Select at least one target.');
          return;
        }

        finish();
        return;
      }

      if (key === ' ') {
        options[activeIndex].selected = !options[activeIndex].selected;
        render();
        return;
      }

      if (key === '\u001b[A') {
        activeIndex = (activeIndex - 1 + options.length) % options.length;
        render();
        return;
      }

      if (key === '\u001b[B') {
        activeIndex = (activeIndex + 1) % options.length;
        render();
      }
    };

    if (typeof input.setRawMode === 'function') {
      input.setRawMode(true);
    }
    input.resume();
    input.setEncoding('utf8');
    output.write('\x1b[?25l');
    render();
    input.on('data', onData);
  });
}

async function resolveInstallTargets(installArgs) {
  const { selectedTargets, nonInteractive } = parseInstallOptions(installArgs);
  const normalized = normalizeTargets(selectedTargets);

  if (normalized.size > 0) {
    return normalized;
  }

  if (nonInteractive || !process.stdin.isTTY) {
    return new Set([TARGETS.copilot]);
  }

  return promptTargetChecklist();
}

async function copyCopilotAgentsIntoProject(projectRoot) {
  const packageRoot = getPackageRootDir();
  const sourceAgentsDir = path.join(packageRoot, '.github', 'agents');
  const targetAgentsDir = path.join(projectRoot, '.github', 'agents');

  if (!existsSync(sourceAgentsDir) || !isDirectory(sourceAgentsDir)) {
    console.error(`[mini-me] Packaged agents folder not found at: ${sourceAgentsDir}`);
    process.exit(1);
  }

  await mkdir(targetAgentsDir, { recursive: true });

  const entries = await readdir(sourceAgentsDir, { withFileTypes: true });
  const agentFiles = entries
    .filter((e) => e.isFile())
    .map((e) => e.name)
    .filter((name) => /^mini-me-.*\.agent\.md$/i.test(name));

  if (agentFiles.length === 0) {
    console.error('[mini-me] No mini-me agent files found to install.');
    process.exit(1);
  }

  for (const fileName of agentFiles) {
    const src = path.join(sourceAgentsDir, fileName);
    const dst = path.join(targetAgentsDir, fileName);
    await copyFile(src, dst);
  }

  console.log(`[mini-me] Installed ${agentFiles.length} Copilot agent file(s) into: ${targetAgentsDir}`);
}

async function copyCursorRulesIntoProject(projectRoot) {
  const packageRoot = getPackageRootDir();
  const sourceRulesDir = path.join(packageRoot, '.cursor', 'rules');
  const targetRulesDir = path.join(projectRoot, '.cursor', 'rules');

  if (!existsSync(sourceRulesDir) || !isDirectory(sourceRulesDir)) {
    console.error(`[mini-me] Packaged Cursor rules folder not found at: ${sourceRulesDir}`);
    process.exit(1);
  }

  await mkdir(targetRulesDir, { recursive: true });

  const entries = await readdir(sourceRulesDir, { withFileTypes: true });
  const ruleFiles = entries
    .filter((e) => e.isFile())
    .map((e) => e.name)
    .filter((name) => /^mini-me-.*\.mdc$/i.test(name));

  if (ruleFiles.length === 0) {
    console.error('[mini-me] No mini-me Cursor rule files found to install.');
    process.exit(1);
  }

  for (const fileName of ruleFiles) {
    const src = path.join(sourceRulesDir, fileName);
    const dst = path.join(targetRulesDir, fileName);
    await copyFile(src, dst);
  }

  console.log(`[mini-me] Installed ${ruleFiles.length} Cursor rule file(s) into: ${targetRulesDir}`);
}

async function copyWorkflowsIntoProject(projectRoot) {
  const packageRoot = getPackageRootDir();
  const sourceModuleDir = path.join(packageRoot, '.mini-me');
  const targetModuleDir = path.join(projectRoot, '.mini-me');

  if (!existsSync(sourceModuleDir) || !isDirectory(sourceModuleDir)) {
    console.error(`[mini-me] Packaged module folder not found at: ${sourceModuleDir}`);
    process.exit(1);
  }

  await cp(sourceModuleDir, targetModuleDir, {
    recursive: true,
    force: true,
  });

  console.log(`[mini-me] Installed module into: ${targetModuleDir}`);
}

function printHelp() {
  console.log(`@orchestrit/mini-me

Usage:
  npx @orchestrit/mini-me install
  npx @orchestrit/mini-me install --target copilot
  npx @orchestrit/mini-me install --target cursor
  npx @orchestrit/mini-me install --target copilot,cursor

Commands:
  install   Run installer with target checklist (default target: copilot)

Options (install):
  -t, --target <copilot,cursor>  Skip checklist and provide one or multiple targets
  -y, --yes                       Non-interactive mode (defaults to copilot if no --target)
`);
}

if (!command || command === "--help" || command === "-h" || command === "help") {
  printHelp();
  process.exit(0);
}

if (command === "install") {
  const projectRoot = process.cwd();
  const selectedTargets = await resolveInstallTargets(args);

  if (selectedTargets.size === 0) {
    console.error('[mini-me] No targets selected. Installation aborted.');
    process.exit(1);
  }

  console.log(`Install orchestr.it/mini-me into: ${projectRoot}`);

  if (selectedTargets.has(TARGETS.copilot)) {
    await copyCopilotAgentsIntoProject(projectRoot);
  }

  if (selectedTargets.has(TARGETS.cursor)) {
    await copyCursorRulesIntoProject(projectRoot);
  }

  await copyWorkflowsIntoProject(projectRoot);

  console.log(`[mini-me] Done. Targets installed: ${Array.from(selectedTargets).join(', ')}`);

  process.exit(0);
}

console.error(`[mini-me] Unknown command: ${command}`);
printHelp();
process.exit(1);
