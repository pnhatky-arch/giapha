import { spawnSync } from 'node:child_process';

const ALLOWED_UNPATCHED_ADVISORY = 'GHSA-vfj7-8cjw-p6xm';
const severityRank = { low: 1, moderate: 2, high: 3, critical: 4 };

const command = process.platform === 'win32' ? 'npm.cmd' : 'npm';
const audit = spawnSync(command, ['audit', '--json'], { encoding: 'utf8' });

let report;
try {
  report = JSON.parse(audit.stdout || '{}');
} catch {
  process.stderr.write(audit.stdout || 'npm audit did not return valid JSON.\n');
  process.stderr.write(audit.stderr || '');
  process.exit(audit.status || 1);
}

const vulnerabilities = Object.entries(report.vulnerabilities ?? {}).filter(([, value]) => {
  const rank = severityRank[value?.severity] ?? 0;
  return rank >= severityRank.moderate;
});

if (vulnerabilities.length === 0) {
  console.log('Security audit OK · no moderate/high/critical vulnerabilities.');
  process.exit(0);
}

const advisoryObjects = vulnerabilities.flatMap(([, value]) =>
  Array.isArray(value?.via) ? value.via.filter((item) => item && typeof item === 'object') : [],
);
const advisoryUrls = advisoryObjects.map((item) => String(item.url ?? ''));
const onlyKnownUnpatchedAdvisory = advisoryObjects.length > 0
  && advisoryUrls.every((url) => url.includes(ALLOWED_UNPATCHED_ADVISORY));

if (onlyKnownUnpatchedAdvisory) {
  const packages = vulnerabilities.map(([name]) => name).join(', ');
  console.warn(`Security audit exception · ${ALLOWED_UNPATCHED_ADVISORY} is currently unpatched upstream. Affected dependency graph: ${packages}`);
  console.warn('All other moderate/high/critical advisories remain blocking.');
  process.exit(0);
}

console.error('Security audit failed. Blocking vulnerabilities:');
for (const [name, value] of vulnerabilities) {
  console.error(`- ${name}: ${value.severity}`);
  for (const via of Array.isArray(value.via) ? value.via : []) {
    if (via && typeof via === 'object') console.error(`  ${via.url ?? via.title ?? 'advisory'}`);
  }
}
process.exit(1);
