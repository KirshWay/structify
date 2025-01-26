import fs from "fs";
import path from "path";
import { ASSET_EXTENSIONS, IGNORE_LIST, isEnvFile } from "./constants.js";

export async function isDirectoryAssetsOnly(dirPath: string): Promise<boolean> {
  const items = await fs.promises.readdir(dirPath, { withFileTypes: true });

  for (const item of items) {
    const name = item.name;
    if (IGNORE_LIST.has(name)) continue;
    if (isEnvFile(name)) continue;

    const fullPath = path.join(dirPath, name);
    if (item.isDirectory()) {
      const onlyAssets = await isDirectoryAssetsOnly(fullPath);
      if (!onlyAssets) return false;
    } else {
      const ext = path.extname(name).toLowerCase();
      if (!ASSET_EXTENSIONS.has(ext)) {
        return false;
      }
    }
  }
  return true;
}
