import chalk from 'chalk';
import figlet from 'figlet';
import fs from 'fs';
import inquirer from 'inquirer';
import path from 'path';

import { CollectedItem, readDirectoryRecursive } from './gather.js';
import { interactiveSelectDirectory } from './interactiveSelect.js';
import { parseGitignore } from './utils.js';

async function main() {
  console.log(
    chalk.blue(figlet.textSync('Welcome to the Structify!', { horizontalLayout: 'fitted' })),
  );

  const { projectDir } = await inquirer.prompt<{ projectDir: string }>([
    {
      name: 'projectDir',
      type: 'input',
      message: 'Path to the directory (default = current):',
      default: process.cwd(),
    },
  ]);
  const startDir = path.resolve(projectDir);

  const gitignore = await parseGitignore(startDir);

  const { mode } = await inquirer.prompt<{ mode: 'all' | 'partial' }>([
    {
      name: 'mode',
      type: 'list',
      message: 'Do you want to collect the entire project or select manually?',
      choices: [
        { name: 'Entire project', value: 'all' },
        { name: 'Partial (multi-level selection)', value: 'partial' },
      ],
    },
  ]);

  let whitelist: string[] = [];
  if (mode === 'partial') {
    whitelist = await interactiveSelectDirectory(startDir);
  }

  const { outputName, outputDir } = await inquirer.prompt<{
    outputName: string;
    outputDir: string;
  }>([
    {
      name: 'outputName',
      type: 'input',
      message: 'Name of the output .md file:',
      default: 'output.md',
    },
    {
      name: 'outputDir',
      type: 'input',
      message: 'Where to save the final file?',
      default: process.cwd(),
    },
  ]);
  const outputFilePath = path.join(path.resolve(outputDir), outputName);

  const items: CollectedItem[] = await readDirectoryRecursive(startDir, whitelist, gitignore);

  let mdContent = '';

  for (const item of items) {
    if (item.type === 'dir-assets-only') {
      const rel = path.relative(startDir, item.path);
      mdContent += '|===================|\n';
      mdContent += `**Directory**: \`${rel}\`\n\n`;
      mdContent += '> This directory contains only images/fonts (skipped).\n\n';
    } else if (item.type === 'file') {
      const rel = path.relative(startDir, item.path);
      const fileData = await fs.promises.readFile(item.path, 'utf-8');
      mdContent += '|===================|\n';
      mdContent += `**File**: \`${rel}\`\n\n`;
      mdContent += '```\n';
      mdContent += fileData;
      mdContent += '\n```\n\n';
    }
  }

  await fs.promises.writeFile(outputFilePath, mdContent, 'utf-8');
  console.log(chalk.cyan(`Done! File created: ${outputFilePath}`));
}

main().catch((err) => {
  console.error(chalk.red('Error:'), err);
});
