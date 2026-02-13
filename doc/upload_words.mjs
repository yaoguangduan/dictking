import { readFileSync, writeFileSync } from 'fs';
import { join } from 'path';
import { execSync } from 'child_process';

const AUTH_USER = 'dtd';
const AUTH_PASS = 'dyq';
const SVR_IP = '120.55.41.145';
const DICTIONARY_ID = 'defaults';

const wordsDir = join(import.meta.dirname, 'words');

const targetWords = [
  'dispel', 'quench', 'pedagogy', 'autonomous', 'saturation',
  'aerial', 'stylistic', 'vibration', 'optimize', 'visualize',
  'obituary', 'rejuvenate', 'yelp', 'secular', 'articulate',
  'amino', 'traverse', 'dignify', 'impending', 'bluster'
];

let success = 0;
let fail = 0;

console.log(`Uploading ${targetWords.length} words to ${SVR_IP}...`);

for (const word of targetWords) {
  const filePath = join(wordsDir, `${word}.json`);
  const data = JSON.parse(readFileSync(filePath, 'utf-8'));

  const brief = data.definitions
    .map(d => `${d.partOfSpeech.en_simple} ${d.translation}`)
    .join('；');

  const payload = {
    word: data.word,
    brief,
    dictionary_id: DICTIONARY_ID,
    data
  };

  // Write temp payload file
  const tmpFile = join(import.meta.dirname, '_tmp_payload.json');
  writeFileSync(tmpFile, JSON.stringify(payload));

  try {
    const result = execSync(
      `curl -s -u "${AUTH_USER}:${AUTH_PASS}" -X PUT "http://${SVR_IP}:3000/api/data/words" -H "Content-Type: application/json" -d @${tmpFile}`,
      { encoding: 'utf-8', timeout: 30000 }
    );
    const parsed = JSON.parse(result);
    if (parsed.code === 'OK') {
      console.log(`✓ ${word}`);
      success++;
    } else {
      console.log(`✗ ${word}: ${result.trim()}`);
      fail++;
    }
  } catch (err) {
    console.log(`✗ ${word}: ${err.message.substring(0, 200)}`);
    fail++;
  }
}

console.log(`\nDone! Success: ${success}, Failed: ${fail}`);
