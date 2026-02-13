<template>
  <div class="word-cloud-sentences-page" :style="themeVars">
    <van-nav-bar 
      title="Word Cloud Sentences" 
      left-arrow 
      @click-left="goBack" 
      fixed 
      placeholder 
      border 
    />

    <div v-if="currentSentence" class="main-content">
      <!-- 内容区域：固定比例布局 -->
      <div class="content-area">
        <!-- 英文例句区域 (40%) -->
        <div class="sentence-section en-section">
          <div class="sentence-en" v-html="highlightKeywords(currentSentence.en, currentSentence.keywords)"></div>
        </div>
        
        <!-- 分割线 -->
        <div class="divider"></div>
        
        <!-- 中文翻译区域 (30%) -->
        <div class="sentence-section zh-section" @click="revealZh = !revealZh">
          <div v-if="revealZh" class="sentence-zh">{{ currentSentence.zh }}</div>
          <div v-else class="zh-hidden">Tap to reveal translation</div>
        </div>

        <!-- 关键词云区域 (30%) -->
        <div class="sentence-section keywords-section">
          <div class="keywords-cloud">
            <van-tag 
              v-for="word in currentSentence.keywords" 
              :key="word"
              class="keyword-tag"
              :color="currentTheme.accent"
              plain
              round
              @click="goToWordDetail(word)"
            >
              {{ word }}
            </van-tag>
          </div>
        </div>
      </div>

      <!-- 底部导航 -->
      <div class="nav-bar">
        <div class="nav-btn primary-btn" @click="showRandomSentence">
          <van-icon name="replay" />
          <span>Next Random</span>
        </div>
        <div class="delete-icon-btn" @click="deleteSentence">
          <van-icon name="delete-o" />
        </div>
      </div>
    </div>

    <van-empty v-else-if="!loading" description="No sentences" />
    
    <van-loading v-if="loading" class="loading" vertical>Loading...</van-loading>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { NavBar, Tag, Empty, Loading, Icon, showToast, showConfirmDialog } from 'vant'
import { sentenceAPI } from '../api'
import { currentDict as userCurrentDict } from '../store/user'

const router = useRouter()

// Premium color palettes
const themes = [
  { name: 'cream',     bg: '#faf6ef', card: '#f5efe5', border: '#e8e0d4', accent: '#9a7b4f', text: '#3d3225', textSub: '#7a6a55', muted: '#a99b88', noteBg: '#f0e8da', highlight: '#8b6914', tagBorder: '#d9ccb8' },
  { name: 'linen',     bg: '#f8f5f0', card: '#f2ede6', border: '#e4dcd2', accent: '#8a7560', text: '#302820', textSub: '#70604e', muted: '#a09080', noteBg: '#ece4da', highlight: '#7a5c36', tagBorder: '#d4c4b0' },
  { name: 'sandstone', bg: '#f8f6f1', card: '#f2efe8', border: '#e4dfd5', accent: '#9a8060', text: '#302a20', textSub: '#706450', muted: '#a09480', noteBg: '#ece6da', highlight: '#886830', tagBorder: '#d4c8b0' },
  { name: 'olive',     bg: '#f6f7f3', card: '#eff2eb', border: '#dde2d6', accent: '#6a7a56', text: '#272e22', textSub: '#5a6650', muted: '#8a967e', noteBg: '#e7ece0', highlight: '#4e6a35', tagBorder: '#c0ccb4' },
  { name: 'paper',     bg: '#f9f7f4', card: '#f3f0eb', border: '#e4dfd8', accent: '#6b7c6b', text: '#2d2d2d', textSub: '#666b66', muted: '#8f9a8f', noteBg: '#eceae4', highlight: '#4a6b4a', tagBorder: '#c8d0c8' },
  { name: 'aqua',      bg: '#f4f8f8', card: '#edf3f3', border: '#dae4e4', accent: '#4a8888', text: '#1e3030', textSub: '#4a6868', muted: '#7a9a9a', noteBg: '#e2ecec', highlight: '#2a7070', tagBorder: '#b0cccc' },
  { name: 'mist',      bg: '#f5f6f8', card: '#eef0f3', border: '#dfe2e8', accent: '#6e7b8b', text: '#242830', textSub: '#5a6370', muted: '#8e96a4', noteBg: '#e6e9ef', highlight: '#4a5d78', tagBorder: '#c0c8d4' },
  { name: 'arctic',    bg: '#f6f8fa', card: '#eff2f5', border: '#dde3ea', accent: '#5882a4', text: '#1f2d3d', textSub: '#516478', muted: '#8298ae', noteBg: '#e4eaf2', highlight: '#3670a0', tagBorder: '#b4c8dc' },
  { name: 'slate',     bg: '#f4f5f7', card: '#eceef1', border: '#dde0e5', accent: '#5c6678', text: '#232730', textSub: '#4e5566', muted: '#848d9e', noteBg: '#e2e5eb', highlight: '#3e5080', tagBorder: '#b8c0cc' },
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

const allSentences = ref([])
const currentSentence = ref(null)
const loading = ref(false)
const revealZh = ref(false)

const loadSentences = async () => {
  loading.value = true
  try {
    const response = await sentenceAPI.getAll(userCurrentDict.value)
    allSentences.value = response.data.sentences || []
    
    if (allSentences.value.length > 0) {
      showRandomSentence()
    }
  } catch (error) {
    console.error('Failed to load sentences:', error)
    showToast(error.response?.data?.message || error.message || 'Load failed')
  } finally {
    loading.value = false
  }
}

const showRandomSentence = () => {
  if (allSentences.value.length === 0) return
  
  let nextIndex
  if (allSentences.value.length === 1) {
    nextIndex = 0
  } else {
    do {
      nextIndex = Math.floor(Math.random() * allSentences.value.length)
    } while (currentSentence.value && allSentences.value[nextIndex].id === currentSentence.value.id)
  }
  
  currentSentence.value = allSentences.value[nextIndex]
  revealZh.value = false
}

const highlightKeywords = (text, keywords) => {
  let highlighted = text
  keywords.forEach(word => {
    const regex = new RegExp(`\\b(${word})\\b`, 'gi')
    highlighted = highlighted.replace(regex, '<span class="highlight">$1</span>')
  })
  return highlighted
}

const goToWordDetail = (word) => {
  router.push(`/word/${word}`)
}

const deleteSentence = async () => {
  if (!currentSentence.value) return
  
  try {
    await showConfirmDialog({
      title: 'Confirm Delete',
      message: 'Are you sure you want to delete this sentence?',
    })
    
    await sentenceAPI.delete(currentSentence.value.id)
    
    // 从列表中移除
    const index = allSentences.value.findIndex(s => s.id === currentSentence.value.id)
    if (index > -1) {
      allSentences.value.splice(index, 1)
    }
    
    // 显示下一个
    if (allSentences.value.length > 0) {
      showRandomSentence()
    } else {
      currentSentence.value = null
    }
    
    showToast('Deleted')
  } catch (error) {
    if (error !== 'cancel') {
      console.error('Failed to delete sentence:', error)
      showToast(error.response?.data?.message || error.message || 'Delete failed')
    }
  }
}

const goBack = () => {
  router.back()
}

onMounted(() => {
  loadSentences()
})
</script>

<style scoped>
.word-cloud-sentences-page {
  height: 100%;
  background: var(--bg, #ffffff);
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.main-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.content-area {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.sentence-section {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0 24px;
  text-align: center;
}

.en-section {
  height: 40%;
}

.zh-section {
  height: 25%;
}

.keywords-section {
  height: 35%;
  align-items: flex-start;
  padding-top: 20px;
}

.divider {
  height: 1px;
  background: var(--border, #f0f0f0);
  margin: 0 40px;
}

.sentence-en {
  font-size: 22px;
  color: var(--text, #1a1a1a);
  line-height: 1.6;
  font-family: 'Georgia', serif;
}

:deep(.highlight) {
  color: var(--accent, #667eea);
  font-weight: 700;
  border-bottom: 2px solid var(--tag-border, rgba(102, 126, 234, 0.3));
}

.sentence-zh {
  font-size: 16px;
  color: var(--text-sub, #666);
  line-height: 1.6;
}

.zh-hidden {
  font-size: 15px;
  color: var(--muted, #ccc);
  cursor: pointer;
}

.zh-section {
  cursor: pointer;
}

.keywords-cloud {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 10px;
}

.keyword-tag {
  cursor: pointer;
  font-weight: 500;
  padding: 4px 12px;
}

.nav-bar {
  padding: 16px;
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 16px;
  background: var(--card, #ffffff);
  border-top: 1px solid var(--border, #f0f0f0);
  flex-shrink: 0;
}

.nav-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 10px 24px;
  background: var(--note-bg, #f5f5f5);
  border-radius: 24px;
  cursor: pointer;
  user-select: none;
  transition: all 0.2s;
}

.nav-btn span {
  font-size: 15px;
  font-weight: 600;
  color: var(--accent, #667eea);
  line-height: 1;
}

.nav-btn :deep(.van-icon) {
  font-size: 16px;
  color: var(--accent, #667eea);
  line-height: 1;
  display: flex;
  align-items: center;
}

.nav-btn:active {
  background: var(--border, #e8e8e8);
}

/* Primary button */
.primary-btn {
  background: var(--accent, #667eea);
  padding: 12px 32px;
}

.primary-btn span {
  color: var(--bg, #ffffff);
  line-height: 1;
}

.primary-btn :deep(.van-icon) {
  color: var(--bg, #ffffff);
  line-height: 1;
  display: flex;
  align-items: center;
}

.primary-btn:active {
  opacity: 0.85;
}

/* Delete icon button */
.delete-icon-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  border-radius: 50%;
  background: transparent;
  cursor: pointer;
  user-select: none;
  transition: all 0.2s;
}

.delete-icon-btn :deep(.van-icon) {
  font-size: 20px;
  color: var(--muted, #ccc);
}

.delete-icon-btn:active {
  background: var(--note-bg, #f5f5f5);
}

.delete-icon-btn:active :deep(.van-icon) {
  color: #ee0a24;
}

.loading {
  display: flex;
  justify-content: center;
  padding: 100px 0;
}
</style>
