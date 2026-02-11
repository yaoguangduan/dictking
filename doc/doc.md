## 单词录入功能
当用户输入单词时，可以根据用户提供的单词以及当前目录的模版文件word.json生成单词释义，然后根据下方提供的接口导入到服务器。
用户没指定词典时，默认都是defaults.
用户也可以说根据词典xxx造句，则根据下方接口，查询词典存在的单词，并按照同目录sentence.json,创建用户说明的例句数量，导入到服务器
用户没说明词典的时候，默认都是defaults

根据模版生成的临时单词json文件可放在当前目录的words目录下，导入完成也不需要删除

下面接口里的AUTH_USER AUTH_PASS SVR_IP请从项目根目录.env文件中读取

## 接口列表

### 查询词典的单词
```shell
curl -u "AUTH_USER:AUTH_PASS" "http://{SVR_IP}:3000/api/data/words?dictionary_id={用户指定的词典ID:defaults}&select=word"
```
响应demo：
```json
{
  "code": "OK",
  "data": [
    {
      "word": "aberrant"
    },
    {
      "word": "allot"
    }
    ...
}
```
### 录入单词
```shell
curl -u "AUTH_USER:AUTH_PASS" -X PUT "http://{SVR_IP}:3000/api/data/words" --data DATA
```
上面的DATA是:
```json
{
      "word": "单词",
      "brief": "单词抽取的简明释义",
      "dictionary_id": "用户指定的词典ID，默认defaults",
      "data": 根据word.json模版生成的json数据
}
```
### 录入例句
```shell
curl -u "AUTH_USER:AUTH_PASS" -X PUT "http://{SVR_IP}:3000/api/data/sentences" --data DATA
```
上面的DATA是:
```json
{
      "dictionary_id": "用户指定的词典ID，默认defaults",
      "data": sentence.json模版生成的json数据
}
```