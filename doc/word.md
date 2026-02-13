# Word Import

When a user provides a word, generate its definition based on `word.json` template, then import it to the server.

Generated word JSON files go into `doc/words/` directory (no need to delete after import).

## API

### Query words in a dictionary
```shell
curl -u "AUTH_USER:AUTH_PASS" "http://{SVR_IP}:3000/api/data/words?dictionary_id={DICT_ID}&select=word"
```
Response:
```json
{
  "code": "OK",
  "data": [
    { "word": "aberrant" },
    { "word": "allot" }
  ]
}
```

### Import a word
```shell
curl -u "AUTH_USER:AUTH_PASS" -X PUT "http://{SVR_IP}:3000/api/data/words" \
  -H "Content-Type: application/json" -d @payload.json
```
Payload:
```json
{
  "word": "the word itself",
  "brief": "concise definition extracted from definitions",
  "dictionary_id": "defaults",
  "data": "<full JSON object matching word.json template>"
}
```

### Batch import
```shell
node doc/upload_words.mjs
```
Reads all JSON files from `doc/words/` and uploads them to the server.
