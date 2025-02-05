import chalk from 'chalk';
import { Command } from 'commander';
import figlet from 'figlet';
import fs from 'fs';
import path from 'path';

import inquirer from 'inquirer';
import { CollectedItem, readDirectoryRecursive } from './gather.js';
import { interactiveSelectDirectory } from './interactiveSelect.js';
import { parseGitignore } from './utils.js';

const program = new Command();

program
  .name('structify')
  .description(
    `CLI tool to document, organize and archive your project structure into a single Markdown file.

Examples:
  $ structify --project /path/to/project --mode all --output structure.md --outdir ./docs
  $ structify --project /path/to/project --mode partial --verbose`,
  )
  .version('1.0.0')
  .option('-p, --project <path>', 'Path to the project directory', process.cwd())
  .option('-m, --mode <mode>', 'Collection mode: "all" or "partial"', 'all')
  .option('-o, --output <filename>', 'Output Markdown file name', 'output.md')
  .option('-d, --outdir <directory>', 'Directory to save the output file', process.cwd())
  .option('-v, --verbose', 'Enable verbose logging', false)
  .option('--no-interactive', 'Disable interactive mode (use CLI options only)');

program.parse(process.argv);

const options = program.opts();
const interactive = options.interactive;

async function main() {
  try {
    console.log(chalk.blue(figlet.textSync('Structify!', { horizontalLayout: 'fitted' })));
    console.log(chalk.green('Welcome to Structify!'));

    let startDir: string;
    let mode: string;
    let whitelist: string[] = [];
    let outputFilePath: string;

    if (interactive) {
      const projectPrompt = await inquirer.prompt<{ projectDir: string }>([
        {
          name: 'projectDir',
          type: 'input',
          message: 'Path to the directory (default = current):',
          default: process.cwd(),
        },
      ]);

      startDir = path.resolve(projectPrompt.projectDir);

      try {
        await fs.promises.access(startDir, fs.constants.F_OK);
      } catch (err) {
        console.error(
          chalk.red(`Project directory "${startDir}" does not exist. Please provide a valid path.`),
        );

        process.exit(1);
      }

      const modePrompt = await inquirer.prompt<{ mode: 'all' | 'partial' }>([
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
      mode = modePrompt.mode;

      if (mode === 'partial') {
        whitelist = await interactiveSelectDirectory(startDir);
      }

      const outputPrompt = await inquirer.prompt<{ outputName: string; outputDir: string }>([
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

      outputFilePath = path.join(path.resolve(outputPrompt.outputDir), outputPrompt.outputName);
    } else {
      startDir = path.resolve(options.project);

      try {
        await fs.promises.access(startDir, fs.constants.F_OK);
      } catch (err) {
        console.error(
          chalk.red(
            `Project directory "${startDir}" does not exist. Please provide a valid path using the --project option.`,
          ),
        );

        process.exit(1);
      }

      mode = options.mode;

      if (mode !== 'all' && mode !== 'partial') {
        console.error(chalk.red('Invalid mode provided. Use "all" or "partial".'));
        process.exit(1);
      }

      if (mode === 'partial') {
        console.error(
          chalk.red(
            'Non-interactive mode does not support "partial" mode. Use "all" or run interactively.',
          ),
        );

        process.exit(1);
      }
      outputFilePath = path.join(path.resolve(options.outdir), options.output);
    }

    const gitignore = await parseGitignore(startDir);

    if (options.verbose) {
      console.log('Starting directory:', startDir);
      console.log('Output file path:', outputFilePath);
    }

    const items: CollectedItem[] = await readDirectoryRecursive(startDir, whitelist, gitignore);

    if (options.verbose) {
      console.log('Collected items:', items);
    }

    let mdContent = '';

    for (const item of items) {
      if (item.type === 'dir-assets-only') {
        const rel = path.relative(startDir, item.path);
        mdContent += '|===================|\n';
        mdContent += `**Directory**: \`${rel}\`\n\n`;
        mdContent += '> This directory contains only images/fonts (skipped).\n\n';
      } else if (item.type === 'file') {
        const rel = path.relative(startDir, item.path);
        let fileData;

        try {
          fileData = await fs.promises.readFile(item.path, 'utf-8');
        } catch (err) {
          console.error(`Error reading file ${item.path}:`, err);

          throw err;
        }
        mdContent += '|===================|\n';
        mdContent += `**File**: \`${rel}\`\n\n`;
        mdContent += '```\n';
        mdContent += fileData;
        mdContent += '\n```\n\n';
      }
    }

    await fs.promises.writeFile(outputFilePath, mdContent, 'utf-8');
    console.log(chalk.cyan(`Done! File created: ${outputFilePath}`));
  } catch (err) {
    console.error(chalk.red('Critical error:'), err);
    process.exit(1);
  }
}

main();
