import { join as joinPath, dirname as getParentPath } from 'path';
import { existsSync, readFileSync, writeFileSync, mkdirSync } from 'fs';

const PATH = joinPath(process.cwd(), 'storage', 'data.json');

export interface StorageCfg {
  knownArticles: string[];
}

export function readStorage(): StorageCfg {
  const json = existsSync(PATH) ? JSON.parse(readFileSync(PATH, 'utf-8')) : null;

  return {
    knownArticles: json?.knownArticles || []
  };
}

export function writeStorage(data: StorageCfg): void {
  if (!existsSync(getParentPath(PATH))) {
    mkdirSync(getParentPath(PATH), { recursive: true });
  }

  writeFileSync(PATH, JSON.stringify(data));
}