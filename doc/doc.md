# DictKing — Doc Directory Guide

## Server & Auth

All API calls use **RestBase** at `http://{SVR_IP}:3000/api/`.
Read `AUTH_USER`, `AUTH_PASS`, `SVR_IP` from the project root `.env` file.

Authentication: HTTP Basic Auth (`-u "AUTH_USER:AUTH_PASS"`).

## Directory Structure

```
doc/
├── doc.md              ← this file (overview)
├── word.md             ← word import guide & API
├── sentence.md         ← sentence import guide & API
├── article.md          ← article import guide & API
├── word.json           ← word data template
├── sentence.json       ← sentence data template
├── article.json        ← article data template
├── upload_words.mjs    ← batch word upload script
├── upload_articles.mjs ← batch article upload script
├── words/              ← generated word JSON files
└── articles/           ← generated article JSON files
```

## Template Files

- `word.json` — defines the full JSON structure for a word entry
- `sentence.json` — defines the JSON structure for a sentence entry
- `article.json` — defines the full JSON structure for an article entry

## Default Dictionary

When the user does not specify a dictionary, always use `defaults`.
