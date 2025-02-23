import { describe, expect, it } from 'vitest';
import { formatOutputFileName } from '../src/utilsCLI';

describe('formatOutputFileName', () => {
  it('should return the original name if extension is provided', () => {
    const result = formatOutputFileName('output.txt', 'md');
    expect(result).toBe('output.txt');
  });

  it('should append the format as extension if missing', () => {
    const result = formatOutputFileName('output', 'md');
    expect(result).toBe('output.md');
  });

  it('should work for different formats', () => {
    expect(formatOutputFileName('myfile', 'txt')).toBe('myfile.txt');
    expect(formatOutputFileName('myfile', 'md')).toBe('myfile.md');
  });
});
