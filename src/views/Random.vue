<template>
  <div class="random-page">
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
        <div v-else class="word-hidden">点击显示单词</div>
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
            查看完整释义 →
          </div>
        </div>
        <div v-else class="meaning-hidden">点击显示释义</div>
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
          <h3>显示设置</h3>
          <van-icon name="cross" @click="showDisplayDialog = false" />
        </div>
        <van-cell-group>
          <van-cell title="隐藏单词">
            <template #right-icon>
              <van-switch v-model="hideWord" @change="saveDisplayPrefs" />
            </template>
          </van-cell>
          <van-cell title="隐藏释义">
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
      title="权重设置"
      show-cancel-button
      @confirm="saveCurrentWeight"
    >
      <div class="weight-dialog-content" v-if="currentWord">
        <div class="current-word-info">
          <h3>{{ currentWord.word }}</h3>
          <p class="weight-desc">权重越低，越容易出现</p>
        </div>
        <div class="weight-slider">
          <div class="weight-info">
            <span>当前权重</span>
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
      加载中...
    </van-loading>
  </div>
</template>

<script>
export default {
  name: 'Random'
}
</script>

<script setup>
import { ref, onMounted, onActivated } from 'vue'
import { useRouter, onBeforeRouteLeave } from 'vue-router'
import { Field, Button, Dialog, Popup, Slider, Icon, Loading, Cell, CellGroup, Switch, showToast } from 'vant'
import { wordAPI, weightAPI } from '../api'
import { currentDict as userCurrentDict } from '../store/user'

const router = useRouter()

const HIDE_WORD_KEY = 'random_hide_word'
const HIDE_MEANING_KEY = 'random_hide_meaning'

const currentWord = ref(null)
const history = ref([])
const weights = ref({})  // 只存储修改过的权重
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
    // 只存储修改过的权重
    weights.value = response.data.weights || {}
  } catch (error) {
    console.error('加载权重失败:', error)
  }
}

const loadRandomWord = async () => {
  loading.value = true
  try {
    const response = await wordAPI.getRandom(userCurrentDict.value)
    
    currentWord.value = response.data
    revealWord.value = false
    revealMeaning.value = false
  } catch (error) {
    console.error('加载单词失败:', error)
    showToast(error.response?.data?.message || error.message || '加载单词失败')
  } finally {
    loading.value = false
  }
}

const openWeightDialog = () => {
  if (currentWord.value) {
    // 设置当前单词的权重（如果没有设置过，默认100）
    currentWeight.value = weights.value[currentWord.value.word] || 100
    showWeightDialog.value = true
  }
}

const saveCurrentWeight = async () => {
  if (!currentWord.value) return
  
  try {
    const wordName = currentWord.value.word
    
    // 更新本地权重
    weights.value[wordName] = currentWeight.value
    
    // 只发送当前单词的权重
    await weightAPI.updateWeights(userCurrentDict.value, {
      [wordName]: currentWeight.value
    })
    showToast('保存成功')
    showWeightDialog.value = false
  } catch (error) {
    console.error('保存权重失败:', error)
    showToast(error.response?.data?.message || error.message || '保存权重失败')
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
    showToast('没有历史记录')
  }
}

const showNext = async () => {
  if (currentWord.value) {
    history.value.push(currentWord.value)
    if (history.value.length > 10) {
      history.value.shift()
    }
  }
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
  background: #f8f9fa;
  overflow: hidden;
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 16px;
  background: white;
  border-bottom: 1px solid #f0f0f0;
  flex-shrink: 0;
}

.header-actions {
  display: flex;
  gap: 16px;
}

.page-header :deep(.van-icon) {
  font-size: 20px;
  color: #666;
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
  color: #1a1a1a;
  margin: 0;
}

.word-hidden {
  font-size: 16px;
  color: #ccc;
}

.divider {
  height: 1px;
  background: #e5e5e5;
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
  background: white;
  border-radius: 8px;
}

.pos {
  font-size: 12px;
  color: #667eea;
  font-weight: 600;
  min-width: 40px;
}

.trans {
  font-size: 16px;
  color: #333;
}

.detail-link {
  margin-top: 12px;
  text-align: left;
  font-size: 14px;
  color: #667eea;
  cursor: pointer;
  padding-left: 16px;
}

.meaning-hidden {
  font-size: 16px;
  color: #ccc;
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
  background: #f5f5f5;
  border-radius: 24px;
  cursor: pointer;
  user-select: none;
  transition: all 0.2s;
}

.nav-btn span {
  font-size: 16px;
  font-weight: 500;
  color: #667eea;
}

.nav-btn :deep(.van-icon) {
  font-size: 18px;
  color: #667eea;
}

.nav-btn:active {
  background: #e8e8e8;
}

.display-dialog {
  background: white;
  border-radius: 16px;
  overflow: hidden;
}

.dialog-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 20px;
  border-bottom: 1px solid #eee;
}

.dialog-header h3 {
  font-size: 16px;
  font-weight: 600;
  color: #1a1a1a;
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
