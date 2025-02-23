import chalk from 'chalk';
import figlet from 'figlet';
import fs from 'fs';
import path from 'path';
import { CLIManager, Options } from './CLIManager.js';
import { CollectedItem, readDirectoryRecursive } from './gather.js';
import { logger } from './logger.js';
import { parseGitignore } from './utils.js';

async function generateOutputContent(items: CollectedItem[], startDir: string): Promise<string> {
  let content = '';

  for (const item of items) {
    const rel = path.relative(startDir, item.path);

    if (item.type === 'dir-assets-only') {
      content += '|===================|\n';
      content += `**Directory**: \`${rel}\`\n\n`;
      content += '> This directory contains only images/fonts (skipped).\n\n';
    } else if (item.type === 'file') {
      let fileData: string;

      try {
        fileData = await fs.promises.readFile(item.path, 'utf-8');
      } catch (err) {
        logger.error(`Error reading file ${item.path}`, err);
        throw err;
      }

      content += '|===================|\n';
      content += `**File**: \`${rel}\`\n\n`;
      content += '```\n';
      content += fileData;
      content += '\n```\n\n';
    }
  }

  return content;
}

async function main() {
  console.log(chalk.blue(figlet.textSync('Structify!', { horizontalLayout: 'fitted' })));
  console.log(chalk.green('Welcome to Structify!'));

  const cliManager = new CLIManager();
  const options: Options = await cliManager.getOptions();

  if (options.verbose) {
    logger.info(`Starting directory: ${options.startDir}`);
    logger.info(`Output file path: ${options.outputFilePath}`);
    logger.info(`Output format: ${options.format}`);
  }

  const gitignore = await parseGitignore(options.startDir);
  const items: CollectedItem[] = await readDirectoryRecursive(
    options.startDir,
    options.whitelist,
    gitignore,
  );

  if (options.verbose) {
    logger.info(`Collected items: ${JSON.stringify(items, null, 2)}`);
  }

  const outputContent = await generateOutputContent(items, options.startDir);

  try {
    await fs.promises.writeFile(options.outputFilePath, outputContent, 'utf-8');
    logger.info(`Done! File created: ${options.outputFilePath}`);
  } catch (err) {
    logger.error('Error writing file:', err);
    process.exit(1);
  }
}

main();
