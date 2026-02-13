# Article Import

Articles are **global** (not tied to any dictionary). Article content follows the `article.json` template.

## Requirements

### Content Source
Articles **must** be extracted from real, reputable English websites. Acceptable sources include:
- **News**: BBC, VOA, The Guardian, The Times, Reuters, AP News, NPR
- **Tech**: TechCrunch, Wired, Ars Technica, The Verge, MIT Technology Review, Hacker News (original articles)
- **Science**: Scientific American, Nature (news section), New Scientist
- **Business**: The Economist, Financial Times, Bloomberg
- **General**: The Atlantic, The New Yorker, Medium (quality long-form)

**Do NOT** fabricate or AI-generate article content. Always extract from a real published article.

### Word Count
The English text of each article (all paragraphs combined) must be **500–1,000 words**.

### Difficulty Levels
- `easy` — Simple vocabulary, short sentences, everyday topics (VOA Learning English, BBC Learning English)
- `medium` — Standard news articles, some domain vocabulary (BBC News, The Guardian)
- `hard` — Complex syntax, academic/specialized vocabulary (The Economist, Scientific American)

### Bilingual & Annotations
- Every paragraph must have both English (`en`) and Chinese translation (`zh`)
- Keywords: pick 3–6 important vocabulary words per paragraph
- Notes: annotate 1–3 useful phrases or sentence patterns per paragraph
- Vocabulary section: extract 5–8 key words from the article with phonetics, part of speech, meaning, and an example sentence from the article
- Discussion questions: provide 2–4 thought-provoking questions in both English and Chinese

## Database Table

```sql
CREATE TABLE articles (
  id INT PRIMARY KEY AUTO_INCREMENT,
  title VARCHAR(512) NOT NULL,
  title_cn VARCHAR(800) NOT NULL DEFAULT '',  -- 中文标题
  tags VARCHAR(500),              -- comma-separated (e.g. "science,AI,technology")
  difficulty VARCHAR(20) NOT NULL, -- easy / medium / hard
  content MEDIUMTEXT,             -- full JSON matching article.json template
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3)
);
```

## API

### Query article list
```shell
curl -u "AUTH_USER:AUTH_PASS" "http://{SVR_IP}:3000/api/data/articles?select=id,title,title_cn,tags,difficulty,created_at"
```

### Query article detail
```shell
curl -u "AUTH_USER:AUTH_PASS" "http://{SVR_IP}:3000/api/data/articles?id={ARTICLE_ID}"
```

### Import an article
```shell
curl -u "AUTH_USER:AUTH_PASS" -X PUT "http://{SVR_IP}:3000/api/data/articles" \
  -H "Content-Type: application/json" -d @payload.json
```
Payload:
```json
{
  "title": "Article title in English",
  "title_cn": "文章中文标题",
  "tags": "tag1,tag2,tag3",
  "difficulty": "easy|medium|hard",
  "content": "<full JSON object matching article.json template>"
}
```

### Batch import
```shell
node doc/upload_articles.mjs
```
Reads all JSON files from `doc/articles/` and uploads them to the server.

## Workflow

1. Find a suitable article from a real English website
2. Translate each paragraph into Chinese
3. Annotate keywords, phrases, and notes
4. Compile vocabulary list and discussion questions
5. Save as JSON file in `doc/articles/` following `article.json` template
6. Run `node doc/upload_articles.mjs` to upload
