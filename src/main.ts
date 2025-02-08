import chalk from 'chalk';
import { Command } from 'commander';
import figlet from 'figlet';
import fs from 'fs';
import inquirer from 'inquirer';
import path from 'path';
import { CollectedItem, readDirectoryRecursive } from './gather.js';
import { interactiveSelectDirectory } from './interactiveSelect.js';
import { parseGitignore } from './utils.js';

type Options = {
  startDir: string;
  mode: 'all' | 'partial';
  whitelist: string[];
  outputFilePath: string;
  verbose: boolean;
  format: string;
};

const program = new Command();

program
  .name('structify')
  .description(
    `CLI tool to document, organize and archive your project structure into a single file.
    
Examples:
  $ structify --project /path/to/project --mode all --output structure --outdir ./docs --format md
  $ structify --project /path/to/project --mode all --output structure --outdir ./docs --format txt`,
  )
  .version('1.0.0')
  .option('-p, --project <path>', 'Path to the project directory', process.cwd())
  .option('-m, --mode <mode>', 'Collection mode: "all" or "partial"', 'all')
  .option('-o, --output <filename>', 'Output file name', 'output')
  .option('-d, --outdir <directory>', 'Directory to save the output file', process.cwd())
  .option('-v, --verbose', 'Enable verbose logging', false)
  .option('--format <format>', 'Output format: txt or md', 'md')
  .option('--no-interactive', 'Disable interactive mode (use CLI options only)');

program.parse(process.argv);

const cliOptions = program.opts();

async function getInteractiveOptions(): Promise<Options> {
  const { projectDir } = await inquirer.prompt<{ projectDir: string }>([
    {
      name: 'projectDir',
      type: 'input',
      message: 'Path to the directory (default = current):',
      default: process.cwd(),
    },
  ]);

  const startDir = path.resolve(projectDir);

  try {
    await fs.promises.access(startDir, fs.constants.F_OK);
  } catch (err) {
    console.error(
      chalk.red(`Project directory "${startDir}" does not exist. Please provide a valid path.`),
    );
    process.exit(1);
  }

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

  const { outputName, outputDir, format } = await inquirer.prompt<{
    outputName: string;
    outputDir: string;
    format: string;
  }>([
    {
      name: 'outputName',
      type: 'input',
      message: 'Name of the output file:',
      default: 'output',
    },
    {
      name: 'outputDir',
      type: 'input',
      message: 'Where to save the final file?',
      default: process.cwd(),
    },
    {
      name: 'format',
      type: 'list',
      message: 'Select output format:',
      choices: [
        { name: '.md (Markdown)', value: 'md' },
        { name: '.txt (Plain Text)', value: 'txt' },
      ],
      default: 'md',
    },
  ]);

  const finalOutputName = path.extname(outputName) ? outputName : `${outputName}.${format}`;
  const outputFilePath = path.join(path.resolve(outputDir), finalOutputName);

  return { startDir, mode, whitelist, outputFilePath, verbose: cliOptions.verbose, format };
}

async function getNonInteractiveOptions(): Promise<Options> {
  const startDir = path.resolve(cliOptions.project);
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

  const mode: 'all' | 'partial' = cliOptions.mode;

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

  const outputNameCli = cliOptions.output;
  const finalOutputNameCli = path.extname(outputNameCli)
    ? outputNameCli
    : `${outputNameCli}.${cliOptions.format}`;
  const outputFilePath = path.join(path.resolve(cliOptions.outdir), finalOutputNameCli);

  return {
    startDir,
    mode,
    whitelist: [],
    outputFilePath,
    verbose: cliOptions.verbose,
    format: cliOptions.format,
  };
}

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
        console.error(`Error reading file ${item.path}:`, err);
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

  const options: Options = cliOptions.interactive
    ? await getInteractiveOptions()
    : await getNonInteractiveOptions();

  if (options.verbose) {
    console.log('Starting directory:', options.startDir);
    console.log('Output file path:', options.outputFilePath);
    console.log('Output format:', options.format);
  }

  const gitignore = await parseGitignore(options.startDir);

  const items: CollectedItem[] = await readDirectoryRecursive(
    options.startDir,
    options.whitelist,
    gitignore,
  );

  if (options.verbose) {
    console.log('Collected items:', items);
  }

  const outputContent = await generateOutputContent(items, options.startDir);

  try {
    await fs.promises.writeFile(options.outputFilePath, outputContent, 'utf-8');
    console.log(chalk.cyan(`Done! File created: ${options.outputFilePath}`));
  } catch (err) {
    console.error(chalk.red('Error writing file:'), err);
    process.exit(1);
  }
}

main();
