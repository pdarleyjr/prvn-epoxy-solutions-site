import { execFileSync } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

const resolveCommit = () => {
  const candidate = process.env.CF_PAGES_COMMIT_SHA || process.env.GITHUB_SHA;
  if (candidate) return candidate;
  try {
    return execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim();
  } catch {
    return 'local-development';
  }
};

const outputDirectory = resolve('public');
mkdirSync(outputDirectory, { recursive: true });
writeFileSync(
  resolve(outputDirectory, 'version.json'),
  `${JSON.stringify({ commit: resolveCommit(), builtAt: new Date().toISOString() }, null, 2)}\n`
);
