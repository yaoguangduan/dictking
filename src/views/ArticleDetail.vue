<template>
  <div class="article-detail-page" :style="themeVars">
    <van-nav-bar
      title="Article"
      left-arrow
      @click-left="goBack"
      fixed
      placeholder
      border
    />

    <div v-if="article" class="detail-content">
      <!-- 文章头部 -->
      <div class="article-header">
        <div class="header-meta">
          <van-tag
            :type="difficultyType(article.difficulty)"
            plain
            size="medium"
            class="difficulty-badge"
          >
            {{ difficultyLabel(article.difficulty) }}
          </van-tag>
          <div v-if="article.tags && article.tags.length" class="header-tags">
            <van-tag
              v-for="tag in article.tags"
              :key="tag"
              plain
              size="medium"
              class="header-tag"
            >
              {{ tag }}
            </van-tag>
          </div>
        </div>
        <h1 class="article-title">{{ article.title }}</h1>
        <p v-if="article.title_zh" class="article-title-zh">{{ article.title_zh }}</p>
      </div>

      <!-- 正文段落 -->
      <div class="paragraphs-section">
        <div
          v-for="(para, index) in article.paragraphs"
          :key="index"
          class="paragraph-block"
        >
          <!-- 段落序号 -->
          <div class="para-number">{{ index + 1 }}</div>

          <!-- 英文段落 -->
          <div class="para-en" v-html="highlightKeywords(para.en, para.keywords)"></div>

          <!-- 中文翻译（点击切换） -->
          <div class="zh-toggle" @click="toggleZh(index)">
            <van-icon :name="expandedZh[index] ? 'eye-o' : 'closed-eye'" size="14" />
            <span>{{ expandedZh[index] ? 'Hide Translation' : 'Show Translation' }}</span>
          </div>
          <transition name="slide-fade">
            <div v-if="expandedZh[index]" class="para-zh">{{ para.zh }}</div>
          </transition>

          <!-- 段落注释（展开/收起） -->
          <div v-if="para.notes && para.notes.length" class="para-notes">
            <div
              class="notes-toggle"
              @click="toggleNotes(index)"
            >
              <van-icon :name="expandedNotes[index] ? 'arrow-up' : 'arrow-down'" size="14" />
              <span>{{ expandedNotes[index] ? 'Hide' : 'View' }} Notes ({{ para.notes.length }})</span>
            </div>
            <transition name="slide-fade">
              <div v-if="expandedNotes[index]" class="notes-list">
                <div v-for="(note, ni) in para.notes" :key="ni" class="note-item">
                  <span class="note-phrase">{{ note.phrase }}</span>
                  <span class="note-explain">{{ note.explain }}</span>
                </div>
              </div>
            </transition>
          </div>
        </div>
      </div>

      <!-- 重点词汇 -->
      <div v-if="article.vocabulary && article.vocabulary.length" class="vocab-section">
        <div class="section-title">
          <van-icon name="bookmark-o" size="18" />
          <span>Key Vocabulary</span>
        </div>
        <div class="vocab-grid">
          <div
            v-for="(vocab, index) in article.vocabulary"
            :key="index"
            class="vocab-card"
            @click="goToWord(vocab.word)"
          >
            <div class="vocab-header">
              <span class="vocab-word">{{ vocab.word }}</span>
              <van-tag v-if="vocab.partOfSpeech" plain size="small" class="vocab-pos">
                {{ vocab.partOfSpeech }}
              </van-tag>
            </div>
            <div v-if="vocab.phonetic" class="vocab-phonetic">{{ vocab.phonetic }}</div>
            <div class="vocab-meaning">{{ vocab.meaning }}</div>
            <div v-if="vocab.example" class="vocab-example">{{ vocab.example }}</div>
          </div>
        </div>
      </div>

      <!-- 讨论问题 -->
      <div v-if="article.discussion_questions && article.discussion_questions.length" class="discussion-section">
        <div class="section-title">
          <van-icon name="chat-o" size="18" />
          <span>Discussion</span>
        </div>
        <div class="discussion-list">
          <div
            v-for="(q, index) in article.discussion_questions"
            :key="index"
            class="discussion-item"
          >
            <div class="q-number">Q{{ index + 1 }}</div>
            <div class="q-content">
              <div class="q-en">{{ q.en }}</div>
              <div class="q-zh">{{ q.zh }}</div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <van-loading v-else class="loading" size="24px" vertical>
      Loading...
    </van-loading>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { NavBar, Tag, Icon, Loading, showToast } from 'vant'
import { articleAPI } from '../api'

const route = useRoute()
const router = useRouter()
const article = ref(null)
const expandedZh = reactive({})
const expandedNotes = reactive({})

// Premium color palettes — inspired by Apple Books, Kindle, Instapaper & editorial design
const themes = [
  // Warm reading tones
  { name: 'cream',     bg: '#faf6ef', card: '#f5efe5', border: '#e8e0d4', accent: '#9a7b4f', text: '#3d3225', textSub: '#7a6a55', muted: '#a99b88', noteBg: '#f0e8da', highlight: '#8b6914', tagBorder: '#d9ccb8' },
  { name: 'linen',     bg: '#f8f5f0', card: '#f2ede6', border: '#e4dcd2', accent: '#8a7560', text: '#302820', textSub: '#70604e', muted: '#a09080', noteBg: '#ece4da', highlight: '#7a5c36', tagBorder: '#d4c4b0' },
  { name: 'sandstone', bg: '#f8f6f1', card: '#f2efe8', border: '#e4dfd5', accent: '#9a8060', text: '#302a20', textSub: '#706450', muted: '#a09480', noteBg: '#ece6da', highlight: '#886830', tagBorder: '#d4c8b0' },
  // Nature-inspired
  { name: 'olive',     bg: '#f6f7f3', card: '#eff2eb', border: '#dde2d6', accent: '#6a7a56', text: '#272e22', textSub: '#5a6650', muted: '#8a967e', noteBg: '#e7ece0', highlight: '#4e6a35', tagBorder: '#c0ccb4' },
  { name: 'paper',     bg: '#f9f7f4', card: '#f3f0eb', border: '#e4dfd8', accent: '#6b7c6b', text: '#2d2d2d', textSub: '#666b66', muted: '#8f9a8f', noteBg: '#eceae4', highlight: '#4a6b4a', tagBorder: '#c8d0c8' },
  { name: 'aqua',      bg: '#f4f8f8', card: '#edf3f3', border: '#dae4e4', accent: '#4a8888', text: '#1e3030', textSub: '#4a6868', muted: '#7a9a9a', noteBg: '#e2ecec', highlight: '#2a7070', tagBorder: '#b0cccc' },
  // Cool & modern
  { name: 'mist',      bg: '#f5f6f8', card: '#eef0f3', border: '#dfe2e8', accent: '#6e7b8b', text: '#242830', textSub: '#5a6370', muted: '#8e96a4', noteBg: '#e6e9ef', highlight: '#4a5d78', tagBorder: '#c0c8d4' },
  { name: 'arctic',    bg: '#f6f8fa', card: '#eff2f5', border: '#dde3ea', accent: '#5882a4', text: '#1f2d3d', textSub: '#516478', muted: '#8298ae', noteBg: '#e4eaf2', highlight: '#3670a0', tagBorder: '#b4c8dc' },
  { name: 'slate',     bg: '#f4f5f7', card: '#eceef1', border: '#dde0e5', accent: '#5c6678', text: '#232730', textSub: '#4e5566', muted: '#848d9e', noteBg: '#e2e5eb', highlight: '#3e5080', tagBorder: '#b8c0cc' },
  // Elegant accents
  { name: 'violet',    bg: '#f7f5fa', card: '#f0edf5', border: '#e2dce8', accent: '#7b68a0', text: '#28203a', textSub: '#6a5880', muted: '#9888aa', noteBg: '#eae4f2', highlight: '#6650a0', tagBorder: '#c8b8d8' },
  { name: 'dawn',      bg: '#faf6f5', card: '#f5efed', border: '#e8dfd9', accent: '#a07060', text: '#352825', textSub: '#7a635a', muted: '#ab968e', noteBg: '#f0e7e3', highlight: '#8a5040', tagBorder: '#d8c4bc' },
  { name: 'rosewood',  bg: '#f9f5f6', card: '#f4edef', border: '#e6dcdf', accent: '#946070', text: '#321e24', textSub: '#785060', muted: '#a88898', noteBg: '#efe4e8', highlight: '#884060', tagBorder: '#d4b8c4' },
]

const currentTheme = ref(themes[Math.floor(Math.random() * themes.length)])

const themeVars = computed(() => {
  const t = currentTheme.value
  return {
    '--bg': t.bg,
    '--card': t.card,
    '--border': t.border,
    '--accent': t.accent,
    '--text': t.text,
    '--text-sub': t.textSub,
    '--muted': t.muted,
    '--note-bg': t.noteBg,
    '--highlight': t.highlight,
    '--tag-border': t.tagBorder,
  }
})

const loadArticle = async () => {
  const articleId = route.params.id
  try {
    const response = await articleAPI.getDetail(articleId)
    article.value = response.data
  } catch (error) {
    console.error('Failed to load article:', error)
    showToast(error.response?.data?.message || error.message || 'Load failed')
    router.back()
  }
}

const goBack = () => {
  router.back()
}

const goToWord = (word) => {
  router.push(`/word/${encodeURIComponent(word)}`)
}

const toggleZh = (index) => {
  expandedZh[index] = !expandedZh[index]
}

const toggleNotes = (index) => {
  expandedNotes[index] = !expandedNotes[index]
}

const highlightKeywords = (text, keywords) => {
  if (!text || !keywords || keywords.length === 0) return text
  let result = text
  keywords.forEach((kw) => {
    const regex = new RegExp(`\\b(${kw.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})\\b`, 'gi')
    result = result.replace(regex, '<span class="keyword-hl">$1</span>')
  })
  return result
}

const difficultyLabel = (level) => {
  const map = { easy: 'Easy', medium: 'Medium', hard: 'Hard' }
  return map[level] || 'Medium'
}

const difficultyType = (level) => {
  const map = { easy: 'success', medium: 'warning', hard: 'danger' }
  return map[level] || 'warning'
}

onMounted(() => {
  loadArticle()
})
</script>

<style scoped>
.article-detail-page {
  height: 100%;
  background: var(--bg);
  overflow-y: auto;
  -webkit-overflow-scrolling: touch;
}

.detail-content {
  padding: 24px 20px 60px;
  max-width: 640px;
  margin: 0 auto;
}

/* ---- 头部 ---- */
.article-header {
  margin-bottom: 28px;
  padding-bottom: 24px;
  border-bottom: 1px solid var(--border);
}

.header-meta {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 16px;
  flex-wrap: wrap;
}

.difficulty-badge {
  font-weight: 600;
  border-radius: 6px;
}

.header-tags {
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
}

.header-tag {
  color: var(--accent);
  border-color: var(--tag-border);
  border-radius: 6px;
  font-size: 12px;
}

.article-title {
  font-size: 26px;
  font-weight: 800;
  color: var(--text);
  line-height: 1.35;
  margin-bottom: 8px;
  letter-spacing: -0.3px;
}

.article-title-zh {
  font-size: 17px;
  color: var(--text-sub);
  line-height: 1.5;
  margin-bottom: 0;
  font-weight: 400;
}

/* ---- 段落 ---- */
.paragraphs-section {
  margin-bottom: 40px;
}

.paragraph-block {
  position: relative;
  padding-left: 36px;
  margin-bottom: 32px;
}

.para-number {
  position: absolute;
  left: 0;
  top: 2px;
  width: 24px;
  height: 24px;
  border-radius: 50%;
  background: var(--accent);
  color: var(--bg);
  font-size: 12px;
  font-weight: 700;
  display: flex;
  align-items: center;
  justify-content: center;
}

.para-en {
  font-size: 16px;
  color: var(--text);
  line-height: 1.85;
  margin-bottom: 8px;
  font-family: 'Georgia', 'Times New Roman', serif;
  letter-spacing: 0.01em;
}

/* 关键词高亮 */
.para-en :deep(.keyword-hl) {
  color: var(--highlight);
  font-weight: 600;
  text-decoration: underline;
  text-decoration-color: rgba(0, 0, 0, 0.15);
  text-underline-offset: 3px;
  cursor: pointer;
}

/* 中文译文切换按钮 */
.zh-toggle {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-size: 12px;
  color: var(--muted);
  cursor: pointer;
  padding: 4px 0;
  margin-bottom: 4px;
  user-select: none;
  transition: color 0.2s;
}

.zh-toggle:active {
  color: var(--accent);
}

.para-zh {
  font-size: 15px;
  color: var(--text-sub);
  line-height: 1.75;
  padding-left: 14px;
  border-left: 3px solid var(--border);
  margin-bottom: 4px;
}

/* ---- 段落注释 ---- */
.para-notes {
  margin-top: 8px;
}

.notes-toggle {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  color: var(--accent);
  cursor: pointer;
  padding: 6px 0;
  font-weight: 500;
}

.notes-list {
  padding: 12px 0 4px;
}

.note-item {
  display: flex;
  gap: 10px;
  margin-bottom: 10px;
  align-items: flex-start;
  font-size: 13px;
  line-height: 1.55;
}

.note-phrase {
  font-weight: 600;
  color: var(--text);
  white-space: nowrap;
  flex-shrink: 0;
  font-family: ui-monospace, 'SF Mono', Monaco, Consolas, Menlo, monospace;
  background: var(--note-bg);
  padding: 2px 8px;
  border-radius: 4px;
}

.note-explain {
  color: var(--text-sub);
}

/* ---- 过渡动画 ---- */
.slide-fade-enter-active {
  transition: all 0.25s ease;
}

.slide-fade-leave-active {
  transition: all 0.2s ease;
}

.slide-fade-enter-from,
.slide-fade-leave-to {
  transform: translateY(-6px);
  opacity: 0;
}

/* ---- 重点词汇 ---- */
.vocab-section {
  margin-bottom: 40px;
}

.section-title {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 12px;
  font-weight: 600;
  color: var(--muted);
  text-transform: uppercase;
  letter-spacing: 0.08em;
  margin-bottom: 20px;
  padding-bottom: 10px;
  border-bottom: 1px solid var(--border);
}

.section-title .van-icon {
  color: var(--accent);
}

.vocab-grid {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.vocab-card {
  background: var(--card);
  border-radius: 12px;
  padding: 16px;
  cursor: pointer;
  transition: all 0.2s ease;
  border: 1px solid transparent;
}

.vocab-card:active {
  border-color: var(--accent);
  background: var(--note-bg);
}

.vocab-header {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 6px;
}

.vocab-word {
  font-size: 17px;
  font-weight: 700;
  color: var(--text);
  font-family: ui-monospace, 'SF Mono', Monaco, Consolas, Menlo, monospace;
}

.vocab-pos {
  color: var(--accent);
  border-color: var(--accent);
  font-size: 11px;
}

.vocab-phonetic {
  font-size: 13px;
  color: var(--muted);
  margin-bottom: 6px;
}

.vocab-meaning {
  font-size: 15px;
  color: var(--text);
  font-weight: 500;
  margin-bottom: 8px;
}

.vocab-example {
  font-size: 13px;
  color: var(--text-sub);
  line-height: 1.6;
  padding-left: 12px;
  border-left: 3px solid var(--accent);
  font-family: 'Georgia', 'Times New Roman', serif;
}

/* ---- 讨论问题 ---- */
.discussion-section {
  margin-bottom: 40px;
}

.discussion-list {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.discussion-item {
  display: flex;
  gap: 14px;
  align-items: flex-start;
}

.q-number {
  flex-shrink: 0;
  width: 32px;
  height: 32px;
  border-radius: 50%;
  background: var(--accent);
  color: var(--bg);
  font-size: 12px;
  font-weight: 700;
  display: flex;
  align-items: center;
  justify-content: center;
}

.q-content {
  flex: 1;
}

.q-en {
  font-size: 15px;
  color: var(--text);
  line-height: 1.65;
  margin-bottom: 6px;
  font-weight: 500;
}

.q-zh {
  font-size: 14px;
  color: var(--muted);
  line-height: 1.55;
}

/* ---- 加载状态 ---- */
.loading {
  display: flex;
  justify-content: center;
  padding: 100px 0;
}
</style>
