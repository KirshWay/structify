export const IGNORE_LIST = new Set<string>([
  "node_modules",
  ".DS_Store",
  "README.md",
  ".gitignore",
  "pnpm-lock.yaml",
  "package-lock.json",
  "yarn.lock",
]);

export function isEnvFile(fileName: string): boolean {
  return fileName.toLowerCase().startsWith(".env");
}

export const IMAGE_EXTENSIONS = new Set<string>([
  ".png", ".jpg", ".jpeg", ".gif", ".webp", ".ico", ".svg",
]);

export const FONT_EXTENSIONS = new Set<string>([
  ".woff", ".woff2", ".ttf", ".eot", ".otf",
]);

export const ASSET_EXTENSIONS = new Set<string>([
  ...IMAGE_EXTENSIONS,
  ...FONT_EXTENSIONS,
]);
