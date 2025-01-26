import fs from "fs/promises";
import ignore, { Ignore } from "ignore";
import path from "path";

export async function parseGitignore(projectDir: string): Promise<Ignore | null> {
  const gitignorePath = path.join(projectDir, ".gitignore");

  try {
    const content = await fs.readFile(gitignorePath, "utf-8");
    const ig = ignore();
    ig.add(content);

    return ig;
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === "ENOENT") {
      return null;
    }
    throw err;
  }
}
