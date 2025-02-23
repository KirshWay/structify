import chalk from 'chalk';

export const logger = {
  error: (msg: string, err?: any) => {
    console.error(chalk.red(`[ERROR] ${msg}`), err || '');
  },
  info: (msg: string) => {
    console.log(chalk.green(`[INFO] ${msg}`));
  },
  debug: (msg: string) => {
    console.debug(chalk.blue(`[DEBUG] ${msg}`));
  },
};
