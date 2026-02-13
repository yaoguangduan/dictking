<template>
  <div class="random-page" :style="themeVars">
    <!-- 顶部栏 -->
    <div class="page-header">
      <div class="header-actions">
        <van-icon name="eye-o" @click="showDisplayDialog = true" />
        <van-icon name="bar-chart-o" @click="openWeightDialog" />
      </div>
    </div>

    <!-- 内容区域 -->
    <div 
      v-if="currentWord"
      class="content-area"
      @touchstart="handleTouchStart"
      @touchmove="handleTouchMove"
      @touchend="handleTouchEnd"
    >
      <!-- 单词区域 -->
      <div class="word-section" @click="toggleWord">
        <h1 v-if="!hideWord || revealWord" class="word">{{ currentWord.word }}</h1>
        <div v-else class="word-hidden">Tap to reveal word</div>
      </div>
      
      <!-- 分割线 -->
      <div class="divider"></div>
      
      <!-- 释义区域 -->
      <div class="meaning-section" @click="toggleMeaning">
        <div v-if="(!hideMeaning || revealMeaning) && currentWord.definitions" class="meanings">
          <div 
            v-for="(def, index) in currentWord.definitions.slice(0, 3)" 
            :key="index"
            class="meaning-item"
          >
            <span class="pos">{{ def.partOfSpeech?.ch }}</span>
            <span class="trans">{{ def.translation }}</span>
          </div>
          <div class="detail-link" @click.stop="goToDetail">
            View full definition →
          </div>
        </div>
        <div v-else class="meaning-hidden">Tap to reveal meaning</div>
      </div>
      
      <!-- 导航按钮 -->
      <div class="nav-bar">
        <div class="nav-btn" @click="showHistory">
          <van-icon name="arrow-left" />
          <span>Prev</span>
        </div>
        <div class="nav-btn" @click="showNext">
          <span>Next</span>
          <van-icon name="arrow" />
        </div>
      </div>
    </div>

    <!-- 显示设置弹窗 -->
    <van-popup
      v-model:show="showDisplayDialog"
      round
      position="bottom"
    >
      <div class="display-dialog">
        <div class="dialog-header">
          <h3>Display Settings</h3>
          <van-icon name="cross" @click="showDisplayDialog = false" />
        </div>
        <van-cell-group>
          <van-cell title="Hide Word">
            <template #right-icon>
              <van-switch v-model="hideWord" @change="saveDisplayPrefs" />
            </template>
          </van-cell>
          <van-cell title="Hide Meaning">
            <template #right-icon>
              <van-switch v-model="hideMeaning" @change="saveDisplayPrefs" />
            </template>
          </van-cell>
        </van-cell-group>
      </div>
    </van-popup>

    <!-- 权重设置弹窗 -->
    <van-dialog
      v-model:show="showWeightDialog"
      title="Weight Settings"
      show-cancel-button
      @confirm="saveCurrentWeight"
    >
      <div class="weight-dialog-content" v-if="currentWord">
        <div class="current-word-info">
          <h3>{{ currentWord.word }}</h3>
          <p class="weight-desc">Lower weight = less likely to appear</p>
        </div>
        <div class="weight-slider">
          <div class="weight-info">
            <span>Current Weight</span>
            <span class="weight-value">{{ currentWeight }}</span>
          </div>
          <van-slider 
            v-model="currentWeight" 
            :min="0" 
            :max="100"
            :step="5"
          />
        </div>
      </div>
    </van-dialog>

    <van-loading v-if="loading" class="loading" size="24px" vertical>
      Loading...
    </van-loading>
  </div>
</template>

<script>
export default {
  name: 'Random'
}
</script>

<script setup>
import { ref, computed, onMounted, onActivated } from 'vue'
import { useRouter, onBeforeRouteLeave } from 'vue-router'
import { Field, Button, Dialog, Popup, Slider, Icon, Loading, Cell, CellGroup, Switch, showToast } from 'vant'
import { wordAPI, weightAPI } from '../api'
import { currentDict as userCurrentDict } from '../store/user'

const router = useRouter()

// Premium color palettes — same as ArticleDetail
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

const HIDE_WORD_KEY = 'random_hide_word'
const HIDE_MEANING_KEY = 'random_hide_meaning'

const currentWord = ref(null)
const history = ref([])
const weights = ref({})  // 存储权重数据：{ word: { id, weight } }
let isFromDetail = false  // 标记是否从详情页返回
const showWeightDialog = ref(false)
const showDisplayDialog = ref(false)
const loading = ref(false)
const hideWord = ref(false)
const hideMeaning = ref(false)
const revealWord = ref(false)
const revealMeaning = ref(false)
const currentWeight = ref(100)  // 当前单词的权重

const touchStartX = ref(0)
const touchOffset = ref(0)

const loadWeights = async () => {
  try {
    const response = await weightAPI.getWeights(userCurrentDict.value)
    // 存储权重数据（包含 id 和 weight）
    weights.value = response.data.weights || {}
    console.log('Loaded weights:', weights.value)
  } catch (error) {
    console.error('Failed to load weights:', error)
  }
}

const loadRandomWord = async () => {
  loading.value = true
  try {
    // 提取历史记录中的单词名称，作为排除列表
    const excludeWords = history.value.map(w => w.word)
    const response = await wordAPI.getRandom(userCurrentDict.value, excludeWords)
    
    currentWord.value = response.data
    revealWord.value = false
    revealMeaning.value = false
  } catch (error) {
    console.error('Failed to load word:', error)
    showToast(error.response?.data?.message || error.message || 'Load failed')
  } finally {
    loading.value = false
  }
}

const openWeightDialog = () => {
  if (currentWord.value) {
    // 设置当前单词的权重（如果没有设置过，默认100）
    const weightData = weights.value[currentWord.value.word]
    currentWeight.value = weightData?.weight || 100
    showWeightDialog.value = true
  }
}

const saveCurrentWeight = async () => {
  if (!currentWord.value) return
  
  try {
    const wordName = currentWord.value.word
    const existingData = weights.value[wordName]
    
    // 构建要更新的权重数据（保留 id）
    const weightData = {
      id: existingData?.id,  // 保留已有的 id，如果是新记录则为 undefined
      weight: currentWeight.value
    }
    
    console.log('Saving weight for', wordName, ':', weightData)
    
    // 发送当前单词的权重
    const response = await weightAPI.updateWeights(userCurrentDict.value, {
      [wordName]: weightData
    })
    
    console.log('Save response:', response.data)
    
    // 从后端响应中获取更新后的数据（包含 id）
    const updatedRecords = response.data?.data || []
    if (updatedRecords.length > 0) {
      // 更新本地权重数据，确保包含后端返回的 id
      updatedRecords.forEach((record) => {
        if (record.word === wordName) {
          weights.value[wordName] = {
            id: record.id,
            weight: record.weight
          }
          console.log('Updated local weight with id:', record.id)
        }
      })
    } else {
      // 如果没有返回数据，至少保存我们发送的权重值
      weights.value[wordName] = weightData
    }
    
    showToast('Saved')
    showWeightDialog.value = false
  } catch (error) {
    console.error('Failed to save weight:', error)
    showToast(error.response?.data?.message || error.message || 'Save failed')
  }
}

const handleTouchStart = (e) => {
  touchStartX.value = e.touches[0].clientX
  touchOffset.value = 0
}

const handleTouchMove = (e) => {
  const currentX = e.touches[0].clientX
  touchOffset.value = currentX - touchStartX.value
}

const handleTouchEnd = () => {
  const threshold = 100
  
  if (touchOffset.value > threshold) {
    showHistory()
  } else if (touchOffset.value < -threshold) {
    showNext()
  }
  
  touchOffset.value = 0
}

const showHistory = () => {
  if (history.value.length > 0) {
    const lastWord = history.value.pop()
    currentWord.value = lastWord
    revealWord.value = false
    revealMeaning.value = false
  } else {
    showToast('No history')
  }
}

const showNext = async () => {
  if (currentWord.value) {
    history.value.push(currentWord.value)
    // 保留最近 10 个单词的历史，避免短期内重复
    if (history.value.length > 10) {
      history.value.shift()
    }
  }
  // 加载随机单词时会自动排除 history 中的单词
  await loadRandomWord()
}

const loadDisplayPrefs = () => {
  hideWord.value = localStorage.getItem(HIDE_WORD_KEY) === 'true'
  hideMeaning.value = localStorage.getItem(HIDE_MEANING_KEY) === 'true'
}

const saveDisplayPrefs = () => {
  localStorage.setItem(HIDE_WORD_KEY, String(hideWord.value))
  localStorage.setItem(HIDE_MEANING_KEY, String(hideMeaning.value))
  if (!hideWord.value) revealWord.value = true
  if (!hideMeaning.value) revealMeaning.value = true
}

const toggleWord = () => {
  if (hideWord.value) {
    revealWord.value = !revealWord.value
  }
}

const toggleMeaning = () => {
  if (hideMeaning.value) {
    revealMeaning.value = !revealMeaning.value
  }
}

const goToDetail = () => {
  if (currentWord.value) {
    router.push(`/word/${currentWord.value.word}`)
  }
}

onMounted(async () => {
  loadDisplayPrefs()
  await loadWeights()
  await loadRandomWord()
})

// 离开页面前标记去向
onBeforeRouteLeave((to, from, next) => {
  isFromDetail = to.path.startsWith('/word/')
  next()
})

// 页面激活时（keep-alive 触发）
onActivated(() => {
  // 从详情页返回时不刷新
  // 从其他页面切换过来时，isFromDetail 已经是 false
  isFromDetail = false
})
</script>

<style scoped>
.random-page {
  height: 100%;
  display: flex;
  flex-direction: column;
  background: var(--bg, #f8f9fa);
  overflow: hidden;
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 16px;
  background: var(--card, white);
  border-bottom: 1px solid var(--border, #f0f0f0);
  flex-shrink: 0;
}

.header-actions {
  display: flex;
  gap: 16px;
}

.page-header :deep(.van-icon) {
  font-size: 20px;
  color: var(--muted, #666);
  cursor: pointer;
}

.content-area {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.word-section {
  height: 20%;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  padding: 0 20px;
}

.word {
  font-size: 48px;
  font-weight: 700;
  color: var(--text, #1a1a1a);
  margin: 0;
}

.word-hidden {
  font-size: 16px;
  color: var(--muted, #ccc);
}

.divider {
  height: 1px;
  background: var(--border, #e5e5e5);
  margin: 0 20px;
}

.meaning-section {
  height: 40%;
  display: flex;
  flex-direction: column;
  justify-content: center;
  cursor: pointer;
  padding: 20px;
  overflow-y: auto;
}

.meanings {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.meaning-item {
  display: flex;
  align-items: baseline;
  gap: 12px;
  padding: 12px 16px;
  background: var(--card, white);
  border-radius: 8px;
}

.pos {
  font-size: 12px;
  color: var(--accent, #667eea);
  font-weight: 600;
  min-width: 40px;
}

.trans {
  font-size: 16px;
  color: var(--text, #333);
}

.detail-link {
  margin-top: 12px;
  text-align: left;
  font-size: 14px;
  color: var(--accent, #667eea);
  cursor: pointer;
  padding-left: 16px;
}

.meaning-hidden {
  font-size: 16px;
  color: var(--muted, #ccc);
  text-align: center;
}

.nav-bar {
  flex: 1;
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 48px;
  padding: 0 16px;
}

.nav-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 12px 24px;
  background: var(--note-bg, #f5f5f5);
  border-radius: 24px;
  cursor: pointer;
  user-select: none;
  transition: all 0.2s;
}

.nav-btn span {
  font-size: 16px;
  font-weight: 500;
  color: var(--accent, #667eea);
}

.nav-btn :deep(.van-icon) {
  font-size: 18px;
  color: var(--accent, #667eea);
}

.nav-btn:active {
  background: var(--border, #e8e8e8);
}

.display-dialog {
  background: var(--card, white);
  border-radius: 16px;
  overflow: hidden;
}

.dialog-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 20px;
  border-bottom: 1px solid var(--border, #eee);
}

.dialog-header h3 {
  font-size: 16px;
  font-weight: 600;
  color: var(--text, #1a1a1a);
  margin: 0;
}

.id-form {
  padding: 16px;
}

.weight-dialog-content {
  padding: 20px;
}

.current-word-info {
  text-align: center;
  margin-bottom: 24px;
}

.current-word-info h3 {
  font-size: 24px;
  font-weight: 600;
  color: #1a1a1a;
  margin: 0 0 8px 0;
}

.weight-desc {
  font-size: 14px;
  color: #999;
  margin: 0;
}

.weight-slider {
  margin-top: 20px;
}

.weight-info {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}

.weight-info span:first-child {
  font-size: 14px;
  color: #666;
}

.weight-value {
  font-size: 16px;
  color: #667eea;
  font-weight: 600;
}

.loading {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
}
</style>
