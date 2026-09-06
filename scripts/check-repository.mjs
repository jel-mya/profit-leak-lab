import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
const files = execFileSync('git', ['ls-files', '--cached', '--others', '--exclude-standard', '-z'], { encoding: 'utf8' }).split('\0').filter(Boolean);
const token = /(?:gh[pousr]_[A-Za-z0-9]{20,}|github_pat_[A-Za-z0-9_]{20,}|sk_live_[A-Za-z0-9]{16,}|sb_secret_[A-Za-z0-9_-]{16,}|-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----)/;
const issues = [];
for (const file of files) {
  if (/(?:^|\/)(?:\.env(?:\..+)?|\.dev\.vars)$/.test(file) && !file.endsWith('.env.example')) issues.push(`${file}: environment file`);
  if (/\.(csv|xlsx|sqlite|pem|key|p12)$/i.test(file)) issues.push(`${file}: prohibited data/key artifact`);
  if (token.test(readFileSync(file, 'utf8'))) issues.push(`${file}: possible credential`);
}
if (issues.length) { console.error(issues.join('\n')); process.exitCode = 1; }
else console.log(`Repository hygiene check passed (${files.length} files; heuristic scan, not a security guarantee).`);
