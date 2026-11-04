// Turns the end-to-end results into a table of acceptance criteria, shown on the pipeline's run page.
import { existsSync, readFileSync } from 'node:fs';

const RESULTS = 'e2e/test-output/results.xml';
const decode = (text) =>
  text.replace(/&apos;/g, "'").replace(/&quot;/g, '"').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&');

if (!existsSync(RESULTS)) {
  console.log('## Acceptance criteria\n\nNo test results: the end-to-end tests did not run.');
  process.exit(0);
}

const rows = [];
for (const match of readFileSync(RESULTS, 'utf8').matchAll(/<testcase name="([^"]*)"[^>]*?(\/>|>([\s\S]*?)<\/testcase>)/g)) {
  const title = decode(match[1]).split('›').pop().trim();
  const criterion = title.match(/^(Story \d+(?: T?AC\d+)+): (.*)$/);
  rows.push({
    story: criterion ? criterion[1].split(' ').slice(0, 2).join(' ') : 'Other',
    criteria: criterion ? criterion[1].split(' ').slice(2).join(', ') : '',
    description: criterion ? criterion[2] : title,
    passed: !/<failure|<error/.test(match[3] ?? ''),
  });
}

const passed = rows.filter((row) => row.passed).length;
console.log(`## Acceptance criteria: ${passed} of ${rows.length} end-to-end tests passed\n`);
console.log('| Result | Story | Criteria | What was proven |\n| --- | --- | --- | --- |');
for (const row of rows.sort((a, b) => a.story.localeCompare(b.story))) {
  console.log(`| ${row.passed ? '✅' : '❌'} | ${row.story} | ${row.criteria} | ${row.description} |`);
}
