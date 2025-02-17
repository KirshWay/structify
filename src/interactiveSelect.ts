import chalk from 'chalk';
import fs from 'fs';
import inquirer from 'inquirer';
import path from 'path';
import { ASSET_EXTENSIONS, IGNORE_LIST, isEnvFile } from './constants.js';

export type FileChoice = string;

type ChoiceItem = {
  name: string;
  value: string;
};

const selectionCache = new Map<string, string[]>();

export async function interactiveSelectDirectory(
  dirPath: string,
  rootDir: string = dirPath,
  useCache: boolean = true,
): Promise<string[]> {
  const results: string[] = [];
  let items;

  try {
    items = await fs.promises.readdir(dirPath, { withFileTypes: true });
  } catch (err) {
    console.error(`Error reading directory ${dirPath}:`, err);
    throw err;
  }

  let choices: ChoiceItem[] = [];
  const choicesMap = new Map<string, boolean>();

  if (dirPath !== rootDir) {
    choices.push({
      name: chalk.yellow('.. (Go up)'),
      value: 'UP',
    });
  }

  for (const item of items) {
    const name = item.name;
    const fullPath = path.join(dirPath, name);

    if (IGNORE_LIST.has(name) || isEnvFile(name)) continue;

    if (!item.isDirectory()) {
      const ext = path.extname(name).toLowerCase();
      if (ASSET_EXTENSIONS.has(ext)) continue;
    }

    choicesMap.set(fullPath, item.isDirectory());
    choices.push({
      name: item.isDirectory() ? chalk.blue(name + '/') : name,
      value: fullPath,
    });
  }

  choices.sort((a, b) => a.name.localeCompare(b.name));

  const defaultSelections = useCache ? selectionCache.get(dirPath) || [] : [];

  const { selected } = await inquirer.prompt<{ selected: FileChoice[] }>([
    {
      name: 'selected',
      type: 'checkbox',
      message: `Select items in "${path.basename(dirPath)}":`,
      choices,
      default: defaultSelections,
      pageSize: 20,
    },
  ]);

  const selectedPaths = selected.filter((p) => p !== 'UP');
  selectionCache.set(dirPath, selectedPaths);

  for (const sel of selected) {
    if (sel === 'UP') {
      const parentDir = path.dirname(dirPath);

      if (!parentDir.startsWith(rootDir)) continue;

      selectionCache.delete(parentDir);

      const parentSelections = await interactiveSelectDirectory(parentDir, rootDir, false);

      results.push(...parentSelections);
    } else if (choicesMap.get(sel)) {
      const { action } = await inquirer.prompt<{ action: 'all' | 'expand' }>([
        {
          name: 'action',
          type: 'list',
          message: `Folder "${path.basename(sel)}": take everything or expand?`,
          choices: [
            { name: 'Take everything', value: 'all' },
            { name: 'Expand (select inside)', value: 'expand' },
          ],
        },
      ]);

      if (action === 'all') {
        results.push(sel);
      } else {
        const subSelections = await interactiveSelectDirectory(sel, rootDir);
        results.push(...subSelections);
      }
    } else {
      results.push(sel);
    }
  }

  return results;
}
