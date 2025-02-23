import path from 'path';

export function formatOutputFileName(outputName: string, format: string): string {
  return path.extname(outputName) ? outputName : `${outputName}.${format}`;
}
