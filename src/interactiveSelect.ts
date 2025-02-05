import fs from 'fs';
import inquirer from 'inquirer';
import path from 'path';
import { ASSET_EXTENSIONS, IGNORE_LIST, isEnvFile } from './constants.js';

export type FileChoice = {
  fullPath: string;
  isDirectory: boolean;
};

type ChoiceItem = {
  name: string;
  value: FileChoice;
};

export async function interactiveSelectDirectory(dirPath: string): Promise<string[]> {
  const results: string[] = [];
  let items;

  try {
    items = await fs.promises.readdir(dirPath, { withFileTypes: true });
  } catch (err) {
    console.error(`Error reading directory ${dirPath}:`, err);

    throw err;
  }

  let choices: ChoiceItem[] = [];

  for (const item of items) {
    const name = item.name;
    const fullPath = path.join(dirPath, name);

    if (IGNORE_LIST.has(name) || isEnvFile(name)) continue;

    if (!item.isDirectory()) {
      const ext = path.extname(name).toLowerCase();
      if (ASSET_EXTENSIONS.has(ext)) continue;
    }

    choices.push({
      name: item.isDirectory() ? `${name}/` : name,
      value: { fullPath, isDirectory: item.isDirectory() },
    });
  }

  choices.sort((a, b) => a.name.localeCompare(b.name));

  if (choices.length === 0) {
    return results;
  }

  let selected;

  try {
    ({ selected } = await inquirer.prompt<{ selected: FileChoice[] }>([
      {
        name: 'selected',
        type: 'checkbox',
        message: `Select items in "${path.basename(dirPath)}":`,
        choices,
        pageSize: 20,
      },
    ]));
  } catch (err) {
    console.error(`Error during interactive selection in ${dirPath}:`, err);

    throw err;
  }

  for (const choice of selected) {
    if (choice.isDirectory) {
      let action;

      try {
        ({ action } = await inquirer.prompt<{ action: 'all' | 'expand' }>([
          {
            name: 'action',
            type: 'list',
            message: `Folder "${path.basename(choice.fullPath)}": take everything or expand?`,
            choices: [
              { name: 'Take everything', value: 'all' },
              { name: 'Expand (select inside)', value: 'expand' },
            ],
          },
        ]));
      } catch (err) {
        console.error(`Error selecting action for directory ${choice.fullPath}:`, err);

        throw err;
      }

      if (action === 'all') {
        results.push(choice.fullPath);
      } else {
        try {
          const subSelections = await interactiveSelectDirectory(choice.fullPath);

          results.push(...subSelections);
        } catch (err) {
          console.error(`Error processing nested directory ${choice.fullPath}:`, err);

          throw err;
        }
      }
    } else {
      results.push(choice.fullPath);
    }
  }

  return results;
}
