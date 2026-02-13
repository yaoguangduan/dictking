import { readFileSync, writeFileSync, readdirSync } from 'fs';
import { join } from 'path';
import { execSync } from 'child_process';

// 从 .env 读取配置（简单解析）
const envPath = join(import.meta.dirname, '..', '.env');
const envContent = readFileSync(envPath, 'utf-8');
const env = {};
envContent.split('\n').forEach(line => {
  const match = line.match(/^(\w+)=(.+)$/);
  if (match) env[match[1]] = match[2].trim();
});

const AUTH_USER = env.AUTH_USER || 'dtd';
const AUTH_PASS = env.AUTH_PASS || 'dyq';
const SVR_IP = env.SVR_IP || '120.55.41.145';

const articlesDir = join(import.meta.dirname, 'articles');

// 先查询服务器已有文章标题，用于去重
let existingTitles = new Set();
try {
  const checkResult = execSync(
    `curl -s -u "${AUTH_USER}:${AUTH_PASS}" "http://${SVR_IP}:3000/api/data/articles?select=title"`,
    { encoding: 'utf-8', timeout: 15000 }
  );
  const parsed = JSON.parse(checkResult);
  if (parsed.code === 'OK' && Array.isArray(parsed.data)) {
    parsed.data.forEach(a => existingTitles.add(a.title));
    console.log(`Found ${existingTitles.size} existing articles on server.`);
  }
} catch (e) {
  console.warn('Warning: could not fetch existing articles, will upload all.', e.message);
}

// 读取 articles 目录下的所有 JSON 文件
const files = readdirSync(articlesDir).filter(f => f.endsWith('.json'));

let success = 0;
let fail = 0;
let skipped = 0;

console.log(`Processing ${files.length} article files...`);

for (const file of files) {
  const filePath = join(articlesDir, file);
  let article;
  try {
    article = JSON.parse(readFileSync(filePath, 'utf-8'));
  } catch (e) {
    console.log(`✗ ${file}: invalid JSON - ${e.message.substring(0, 100)}`);
    fail++;
    continue;
  }

  // 去重：跳过已存在的文章
  if (existingTitles.has(article.title)) {
    console.log(`~ Skipped (exists): ${article.title}`);
    skipped++;
    continue;
  }

  // 构建 payload
  const payload = {
    title: article.title,
    title_cn: article.title_zh || article.title_cn || '',
    tags: Array.isArray(article.tags) ? article.tags.join(',') : (article.tags || ''),
    difficulty: article.difficulty || 'medium',
    content: article
  };

  const tmpFile = join(import.meta.dirname, '_tmp_article_payload.json');
  writeFileSync(tmpFile, JSON.stringify(payload));

  try {
    const result = execSync(
      `curl -s -u "${AUTH_USER}:${AUTH_PASS}" -X PUT "http://${SVR_IP}:3000/api/data/articles" -H "Content-Type: application/json" -d @${tmpFile}`,
      { encoding: 'utf-8', timeout: 30000 }
    );
    const parsed = JSON.parse(result);
    if (parsed.code === 'OK') {
      console.log(`✓ ${article.title}`);
      success++;
    } else {
      console.log(`✗ ${file}: ${result.trim()}`);
      fail++;
    }
  } catch (err) {
    console.log(`✗ ${file}: ${err.message.substring(0, 200)}`);
    fail++;
  }
}

console.log(`\nDone! Success: ${success}, Skipped: ${skipped}, Failed: ${fail}`);
