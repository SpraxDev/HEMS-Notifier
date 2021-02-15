import * as fs from 'fs';
import { join as joinPath } from 'path';

export const runningInProduction = process.env.NODE_ENV == 'production';
export const appVersion: string = JSON.parse(fs.readFileSync(joinPath(__dirname, '..', 'package.json'), 'utf-8')).version ?? 'UNKNOWN_APP_VERSION';