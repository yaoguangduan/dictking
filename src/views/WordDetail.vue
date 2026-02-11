<template>
  <div class="word-detail-page">
    <van-nav-bar
      title="单词详情"
      left-arrow
      @click-left="goBack"
      fixed
      placeholder
      border
    />

    <div v-if="word" class="detail-content">
      <!-- 单词头部 -->
      <div class="word-header">
        <h1 class="word-name">{{ word.word }}</h1>
        <div class="phonetics">
          <van-tag v-if="word.phonetic?.uk" type="primary" plain class="phonetic-tag">
            英 {{ word.phonetic.uk }}
          </van-tag>
          <van-tag v-if="word.phonetic?.us" type="primary" plain class="phonetic-tag">
            美 {{ word.phonetic.us }}
          </van-tag>
        </div>
      </div>

      <!-- 词源 -->
      <div v-if="word.etymology" class="info-block">
        <div class="block-title">词源</div>
        <div class="block-content etymology-text">
          {{ word.etymology.origin }}
        </div>
      </div>

      <!-- 释义（包含搭配、短语、同/反义词） -->
      <div class="info-block">
        <div class="block-title">释义</div>
        <div 
          v-for="(def, index) in word.definitions" 
          :key="index"
          class="definition-item"
        >
          <div class="def-main">
            <van-tag type="primary" class="pos-tag">{{ def.partOfSpeech?.ch }}</van-tag>
            <span class="def-translation">{{ def.translation }}</span>
          </div>

          <div v-if="def.usage_note" class="usage-note">
            {{ def.usage_note }}
          </div>

          <!-- 例句 -->
          <div v-if="def.sentences && def.sentences.length" class="sub-section">
            <div class="sub-title">例句</div>
            <div 
              v-for="(sentence, sIndex) in def.sentences" 
              :key="sIndex"
              class="quote-item"
            >
              <div class="en">{{ sentence.en }}</div>
              <div class="zh">{{ sentence.zh }}</div>
            </div>
          </div>

          <!-- 常用搭配（属于该释义） -->
          <div v-if="def.collocations && def.collocations.length" class="sub-section">
            <div class="sub-title">常用搭配</div>
            <div 
              v-for="(col, cIndex) in def.collocations" 
              :key="cIndex"
              class="item-group"
            >
              <div class="pair">
                <span class="bold">{{ col.collocation }}</span>
                <span class="gray">{{ col.translation }}</span>
              </div>
              <div v-if="col.sentences && col.sentences.length" class="sub-quotes">
                <div v-for="(s, si) in col.sentences" :key="si" class="quote-item mini">
                  <div class="en">{{ s.en }}</div>
                  <div class="zh">{{ s.zh }}</div>
                </div>
              </div>
            </div>
          </div>

          <!-- 固定短语（属于该释义） -->
          <div v-if="def.phrases && def.phrases.length" class="sub-section">
            <div class="sub-title">固定短语</div>
            <div 
              v-for="(phrase, pIndex) in def.phrases" 
              :key="pIndex"
              class="item-group"
            >
              <div class="pair">
                <span class="bold">{{ phrase.phrase }}</span>
                <span class="gray">{{ phrase.translation }}</span>
              </div>
              <div v-if="phrase.sentences && phrase.sentences.length" class="sub-quotes">
                <div v-for="(s, si) in phrase.sentences" :key="si" class="quote-item mini">
                  <div class="en">{{ s.en }}</div>
                  <div class="zh">{{ s.zh }}</div>
                </div>
              </div>
            </div>
          </div>

          <!-- 同义词（属于该释义） -->
          <div v-if="def.synonyms && Object.keys(def.synonyms).length" class="sub-section">
            <div class="sub-title">同义词</div>
            <div class="synonym-list">
              <div v-for="(syn, sWord) in def.synonyms" :key="sWord" class="synonym-item">
                <div class="syn-header">
                  <van-tag type="success" plain class="chip">{{ sWord }}</van-tag>
                  <span class="syn-trans">{{ syn.translation }}</span>
                </div>
                <div v-if="syn.diffs" class="syn-diff">{{ syn.diffs }}</div>
                <div v-if="syn.sentences && syn.sentences.length" class="sub-quotes">
                  <div v-for="(s, si) in syn.sentences" :key="si" class="quote-item mini">
                    <div class="en">{{ s.en }}</div>
                    <div class="zh">{{ s.zh }}</div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- 反义词（属于该释义） -->
          <div v-if="def.antonyms && Object.keys(def.antonyms).length" class="sub-section">
            <div class="sub-title">反义词</div>
            <div class="antonym-list">
              <div v-for="(ant, aWord) in def.antonyms" :key="aWord" class="antonym-item">
                <div class="ant-header">
                  <van-tag type="danger" plain class="chip">{{ aWord }}</van-tag>
                  <span class="ant-trans">{{ ant.translation }}</span>
                </div>
                <div v-if="ant.diffs" class="ant-diff">{{ ant.diffs }}</div>
                <div v-if="ant.sentences && ant.sentences.length" class="sub-quotes">
                  <div v-for="(s, si) in ant.sentences" :key="si" class="quote-item mini">
                    <div class="en">{{ s.en }}</div>
                    <div class="zh">{{ s.zh }}</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- 相关词汇 -->
      <div v-if="word.related_words && Object.keys(word.related_words).length" class="info-block">
        <div class="block-title">相关词汇</div>
        <div 
          v-for="(related, relWord) in word.related_words" 
          :key="relWord"
          class="related-item-group"
        >
          <div class="related-main">
            <span class="bold">{{ relWord }}</span>
            <van-tag v-if="related.class?.ch" type="primary" plain size="small" class="ml-8">{{ related.class.ch }}</van-tag>
            <span class="gray ml-8">{{ related.translation }}</span>
          </div>
          <div v-if="related.rule" class="related-rule">{{ related.rule }}</div>
          <div v-if="related.sentences && related.sentences.length" class="sub-quotes">
            <div v-for="(s, si) in related.sentences" :key="si" class="quote-item mini">
              <div class="en">{{ s.en }}</div>
              <div class="zh">{{ s.zh }}</div>
            </div>
          </div>
        </div>
      </div>

      <!-- 习语表达 -->
      <div v-if="word.idioms && word.idioms.length" class="info-block">
        <div class="block-title">习语表达</div>
        <div 
          v-for="(idiom, index) in word.idioms" 
          :key="index"
          class="item-group"
        >
          <div class="pair">
            <span class="bold">{{ idiom.idiom }}</span>
            <span class="gray">{{ idiom.translation }}</span>
          </div>
          <div v-if="idiom.explain" class="usage-note mini">{{ idiom.explain }}</div>
          <div v-if="idiom.sentences && idiom.sentences.length" class="sub-quotes">
            <div v-for="(s, si) in idiom.sentences" :key="si" class="quote-item mini">
              <div class="en">{{ s.en }}</div>
              <div class="zh">{{ s.zh }}</div>
            </div>
          </div>
        </div>
      </div>

      <!-- 常见错误 -->
      <div v-if="word.common_mistakes && word.common_mistakes.length" class="info-block">
        <div class="block-title">常见错误</div>
        <div 
          v-for="(mistake, index) in word.common_mistakes" 
          :key="index"
          class="mistake-item"
        >
          <div class="wrong-row">
            <van-icon name="close" color="#ee0a24" />
            <span class="wrong-text">{{ mistake.wrong }}</span>
          </div>
          <div class="correct-row">
            <van-icon name="success" color="#07c160" />
            <span class="correct-text">{{ mistake.correct }}</span>
          </div>
          <div class="mistake-explain">{{ mistake.explain }}</div>
        </div>
      </div>

      <!-- 记忆技巧 -->
      <div v-if="word.mnemonics && word.mnemonics.length" class="info-block">
        <div class="block-title">记忆技巧</div>
        <div 
          v-for="(mnemonic, index) in word.mnemonics" 
          :key="index"
          class="mnemonic-item"
        >
          <van-tag type="warning" plain class="mnemonic-tag">{{ mnemonic.type }}</van-tag>
          <div class="mnemonic-content">{{ mnemonic.content }}</div>
        </div>
      </div>
    </div>

    <van-loading v-else class="loading" size="24px" vertical>
      加载中...
    </van-loading>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { NavBar, Tag, Icon, Loading, Cell, CellGroup, showToast } from 'vant'
import { wordAPI } from '../api'
import { currentDict as userCurrentDict } from '../store/user'

const route = useRoute()
const router = useRouter()
const word = ref(null)

const loadWord = async () => {
  const wordName = route.params.word
  try {
    const response = await wordAPI.getDetail(userCurrentDict.value, wordName)
    word.value = response.data
  } catch (error) {
    console.error('加载失败:', error)
    showToast(error.response?.data?.message || error.message || '加载失败')
    router.back()
  }
}

const goBack = () => {
  router.back()
}

onMounted(() => {
  loadWord()
})
</script>

<style scoped>
.word-detail-page {
  height: 100%;
  background: #fff;
  overflow-y: auto;
  -webkit-overflow-scrolling: touch;
}

.detail-content {
  padding: 24px 20px 40px;
  max-width: 640px;
  margin: 0 auto;
}

.word-header {
  margin-bottom: 40px;
  padding-bottom: 24px;
  border-bottom: 1px solid #e8eaed;
}

.word-name {
  font-size: 40px;
  font-weight: 700;
  color: #1a1a1a;
  margin-bottom: 16px;
  letter-spacing: -0.5px;
  font-family: ui-monospace, 'SF Mono', Monaco, 'Cascadia Code', Consolas, Menlo, monospace;
}

.phonetics {
  display: flex;
  gap: 12px;
  flex-wrap: wrap;
}

.phonetic-tag {
  padding: 6px 12px;
  font-size: 14px;
}

.info-block {
  margin-bottom: 40px;
}

.block-title {
  font-size: 12px;
  font-weight: 600;
  color: #8b949e;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  margin-bottom: 20px;
  padding-bottom: 10px;
  border-bottom: 1px solid #e8eaed;
}

.block-content {
  font-size: 16px;
  color: #333;
  line-height: 1.7;
}

.etymology-text {
  color: #57606a;
  font-size: 15px;
  line-height: 1.65;
}

.definition-item {
  margin-bottom: 40px;
  padding-bottom: 40px;
  border-bottom: 1px solid #e8eaed;
}

.definition-item:last-child {
  border-bottom: none;
  margin-bottom: 0;
  padding-bottom: 0;
}

.def-main {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 16px;
}

.pos-tag {
  font-weight: 600;
}

.def-translation {
  font-size: 18px;
  font-weight: 600;
  color: #1a1a1a;
}

.usage-note {
  font-size: 14px;
  color: #7c5c00;
  background: #fcf4e3;
  padding: 14px 16px;
  margin-bottom: 20px;
  line-height: 1.55;
  border-left: 3px solid #e6b800;
}

.usage-note.mini {
  margin-top: 12px;
  margin-bottom: 12px;
  padding: 10px 14px;
  font-size: 13px;
}

.sub-section {
  margin-top: 28px;
}

.sub-title {
  font-size: 13px;
  font-weight: 600;
  color: #8b949e;
  margin-bottom: 16px;
}

.quote-item {
  position: relative;
  padding: 16px 0 16px 16px;
  margin-bottom: 20px;
  border-left: 4px solid #667eea;
  padding-left: 20px;
}

.quote-item.mini {
  padding: 12px 0 12px 14px;
  margin-bottom: 12px;
  border-left-width: 3px;
  padding-left: 16px;
}

/* 英文：等宽、非斜体，便于阅读 */
.quote-item .en {
  font-size: 15px;
  color: #24292f;
  line-height: 1.65;
  font-family: ui-monospace, 'SF Mono', Monaco, 'Cascadia Code', Consolas, Menlo, monospace;
  margin-bottom: 10px;
}

.quote-item.mini .en {
  font-size: 14px;
}

.quote-item .zh {
  font-size: 14px;
  color: #57606a;
  line-height: 1.6;
}

.quote-item.mini .zh {
  font-size: 13px;
}

.item-group {
  margin-bottom: 28px;
}

.sub-quotes {
  margin-top: 16px;
  padding-left: 0;
}

.pair {
  display: flex;
  gap: 10px;
  font-size: 15px;
  align-items: baseline;
  flex-wrap: wrap;
}

.bold {
  font-weight: 600;
  color: #24292f;
  font-family: ui-monospace, 'SF Mono', Monaco, Consolas, Menlo, monospace;
}

.gray {
  color: #8b949e;
  font-size: 14px;
}

.synonym-list,
.antonym-list {
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.synonym-item,
.antonym-item {
  display: flex;
  flex-direction: column;
}

.syn-header,
.ant-header {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 8px;
}

.syn-trans,
.ant-trans {
  font-size: 14px;
  color: #333;
  font-weight: 500;
}

.syn-diff,
.ant-diff {
  font-size: 13px;
  color: #57606a;
  line-height: 1.6;
  padding-left: 0;
  font-style: normal;
}

.chip {
  font-weight: 600;
}

.related-item-group {
  margin-bottom: 28px;
}

.related-main {
  display: flex;
  align-items: center;
  margin-bottom: 8px;
  flex-wrap: wrap;
  gap: 8px;
}

.related-rule {
  font-size: 13px;
  color: #57606a;
  font-style: normal;
  margin-bottom: 12px;
  padding-left: 0;
  line-height: 1.55;
}

.ml-8 {
  margin-left: 8px;
}

.mistake-item {
  margin-bottom: 28px;
}

.wrong-row,
.correct-row {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 8px;
}

.wrong-text {
  color: #cf222e;
  text-decoration: line-through;
  font-size: 15px;
}

.correct-text {
  color: #1a7f37;
  font-weight: 600;
  font-size: 15px;
}

.mistake-explain {
  font-size: 13px;
  color: #57606a;
  margin-top: 8px;
  padding-left: 28px;
  line-height: 1.55;
}

.mnemonic-item {
  margin-bottom: 24px;
}

.mnemonic-tag {
  margin-bottom: 10px;
}

.mnemonic-content {
  font-size: 15px;
  color: #24292f;
  line-height: 1.65;
}

.loading {
  display: flex;
  justify-content: center;
  padding: 100px 0;
}

:deep(.van-cell-group--inset) {
  margin: 0;
}

:deep(.van-cell) {
  padding: 12px 0;
}
</style>
