import chalk from 'chalk';
import { Command } from 'commander';
import fs from 'fs';
import inquirer from 'inquirer';
import os from 'os';
import path from 'path';
import { interactiveSelectDirectory } from './interactiveSelect.js';
import { formatOutputFileName } from './utilsCLI.js';

export type Options = {
  startDir: string;
  mode: 'all' | 'partial';
  whitelist: string[];
  outputFilePath: string;
  verbose: boolean;
  format: string;
};

export class CLIManager {
  private program: Command;
  private cliOptions: any;

  constructor() {
    this.program = new Command();
    this.program
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
      .option('-o, --output <filename>', 'Output file name (without extension)', 'output')
      .option(
        '-d, --outdir <directory>',
        'Directory to save the output file',
        (() => {
          const downloads = path.join(os.homedir(), 'Downloads');
          try {
            fs.accessSync(downloads);
            return downloads;
          } catch {
            return process.cwd();
          }
        })(),
      )
      .option('-v, --verbose', 'Enable verbose logging', false)
      .option('--format <format>', 'Output format: txt or md', 'md')
      .option('--no-interactive', 'Disable interactive mode (use CLI options only)');

    this.program.parse(process.argv);
    this.cliOptions = this.program.opts();
  }

  public async getOptions(): Promise<Options> {
    if (this.cliOptions.interactive) {
      return await this.getInteractiveOptions();
    } else {
      return await this.getNonInteractiveOptions();
    }
  }

  private async getInteractiveOptions(): Promise<Options> {
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

    const defaultOutDir = (() => {
      const downloads = path.join(os.homedir(), 'Downloads');
      try {
        fs.accessSync(downloads);
        return downloads;
      } catch {
        return process.cwd();
      }
    })();

    const { outputName, outputDir, format } = await inquirer.prompt<{
      outputName: string;
      outputDir: string;
      format: string;
    }>([
      {
        name: 'outputName',
        type: 'input',
        message: 'Name of the output file (without extension):',
        default: 'output',
      },
      {
        name: 'outputDir',
        type: 'input',
        message: 'Where to save the final file?',
        default: defaultOutDir,
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

    const finalOutputName = formatOutputFileName(outputName, format);
    const outputFilePath = path.join(path.resolve(outputDir), finalOutputName);

    return {
      startDir,
      mode,
      whitelist,
      outputFilePath,
      verbose: this.cliOptions.verbose,
      format,
    };
  }

  private async getNonInteractiveOptions(): Promise<Options> {
    const startDir = path.resolve(this.cliOptions.project);
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
    const mode: 'all' | 'partial' = this.cliOptions.mode;
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
    const outputNameCli = this.cliOptions.output;
    const finalOutputNameCli = formatOutputFileName(outputNameCli, this.cliOptions.format);
    const outputFilePath = path.join(path.resolve(this.cliOptions.outdir), finalOutputNameCli);

    return {
      startDir,
      mode,
      whitelist: [],
      outputFilePath,
      verbose: this.cliOptions.verbose,
      format: this.cliOptions.format,
    };
  }
}
