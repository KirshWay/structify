import fs from 'fs/promises';
import os from 'os';
import path from 'path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { isDirectoryAssetsOnly } from '../src/resourceCheck';

describe('isDirectoryAssetsOnly', () => {
  const tmpDir = path.join(os.tmpdir(), 'structify-test-dir');

  beforeAll(async () => {
    await fs.mkdir(tmpDir, { recursive: true });
    await fs.writeFile(path.join(tmpDir, 'image.png'), '');
    await fs.writeFile(path.join(tmpDir, 'file.txt'), 'some content');
  });

  afterAll(async () => {
    await fs.rm(tmpDir, { recursive: true, force: true });
  });

  it('should return false if non-asset file is present', async () => {
    const result = await isDirectoryAssetsOnly(tmpDir);
    expect(result).toBe(false);
  });

  it('should return true if directory contains only asset files', async () => {
    const assetDir = path.join(tmpDir, 'assetsOnly');
    await fs.mkdir(assetDir, { recursive: true });
    await fs.writeFile(path.join(assetDir, 'pic.png'), '');
    const result = await isDirectoryAssetsOnly(assetDir);
    expect(result).toBe(true);
  });
});
