# Sentence Import

When a user asks to create sentences for a dictionary, query existing words in that dictionary, then generate sentences based on `sentence.json` template.

## API

### Import a sentence
```shell
curl -u "AUTH_USER:AUTH_PASS" -X PUT "http://{SVR_IP}:3000/api/save/sentences" \
  -H "Content-Type: application/json" -d @payload.json
```
Payload:
```json
{
  "dictionary_id": "defaults",
  "data": "<JSON object matching sentence.json template>"
}
```
