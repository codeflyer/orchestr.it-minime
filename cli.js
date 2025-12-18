#!/usr/bin/env node

const [, , command, ...args] = process.argv;

import { existsSync, statSync } from 'node:fs';
import { mkdir, readdir, copyFile, cp } from 'node:fs/promises';
import path from 'node:path';
import { createInterface } from 'node:readline/promises';
import { stdin as input, stdout as output } from 'node:process';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';

function isDirectory(maybePath) {
  try {
    return statSync(maybePath).isDirectory();
  } catch {
    return false;
  }
}

async function promptYesNo(question) {
  const rl = createInterface({ input, output });
  try {
    const answer = (await rl.question(question)).trim().toLowerCase();
    return answer === 'y' || answer === 'yes';
  } finally {
    rl.close();
  }
}

function runCommand(command, commandArgs, cwd) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, commandArgs, {
      cwd,
      stdio: 'inherit',
      shell: false,
    });

    child.on('error', reject);
    child.on('exit', (code) => {
      if (code === 0) resolve();
      else reject(new Error(`${command} exited with code ${code ?? 'unknown'}`));
    });
  });
}

function getPackageRootDir() {
  // cli.js lives at the npm package root.
  return path.dirname(fileURLToPath(import.meta.url));
}

async function copyAgentsIntoProject(projectRoot) {
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

  console.log(`[mini-me] Installed ${agentFiles.length} agent file(s) into: ${targetAgentsDir}`);
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

Commands:
  install   Run installer (currently a placeholder)
`);
}

if (!command || command === "--help" || command === "-h" || command === "help") {
  printHelp();
  process.exit(0);
}

if (command === "install") {
  const projectRoot = process.cwd();

  // Placeholder: we'll add real installation steps later.
  console.log(`Install orchestr.it/mini-me agents into: ${projectRoot}`);
  await copyAgentsIntoProject(projectRoot);
  await copyWorkflowsIntoProject(projectRoot);

  process.exit(0);
}

console.error(`[mini-me] Unknown command: ${command}`);
printHelp();
process.exit(1);
