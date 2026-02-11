<template>
  <div class="word-cloud-sentences-page">
    <van-nav-bar 
      title="词云例句" 
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
          <div v-else class="zh-hidden">点击显示中文释义</div>
        </div>

        <!-- 关键词云区域 (30%) -->
        <div class="sentence-section keywords-section">
          <div class="keywords-cloud">
            <van-tag 
              v-for="word in currentSentence.keywords" 
              :key="word"
              class="keyword-tag"
              color="#667eea"
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

    <van-empty v-else-if="!loading" description="暂无例句" />
    
    <van-loading v-if="loading" class="loading" vertical>加载中...</van-loading>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { NavBar, Tag, Empty, Loading, Icon, showToast, showConfirmDialog } from 'vant'
import { sentenceAPI } from '../api'
import { currentDict as userCurrentDict } from '../store/user'

const router = useRouter()
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
    console.error('加载例句失败:', error)
    showToast(error.response?.data?.message || error.message || '加载例句失败')
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
      title: '确认删除',
      message: '确定要删除这条例句吗？',
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
    
    showToast('删除成功')
  } catch (error) {
    if (error !== 'cancel') {
      console.error('删除例句失败:', error)
      showToast(error.response?.data?.message || error.message || '删除失败')
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
  background: #ffffff;
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
  background: #f0f0f0;
  margin: 0 40px;
}

.sentence-en {
  font-size: 22px;
  color: #1a1a1a;
  line-height: 1.6;
  font-family: 'Georgia', serif;
}

:deep(.highlight) {
  color: #667eea;
  font-weight: 700;
  border-bottom: 2px solid rgba(102, 126, 234, 0.3);
}

.sentence-zh {
  font-size: 16px;
  color: #666;
  line-height: 1.6;
}

.zh-hidden {
  font-size: 15px;
  color: #ccc;
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
  background: #ffffff;
  border-top: 1px solid #f0f0f0;
  flex-shrink: 0;
}

.nav-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 10px 24px;
  background: #f5f5f5;
  border-radius: 24px;
  cursor: pointer;
  user-select: none;
  transition: all 0.2s;
}

.nav-btn span {
  font-size: 15px;
  font-weight: 600;
  color: #667eea;
  line-height: 1;
}

.nav-btn :deep(.van-icon) {
  font-size: 16px;
  color: #667eea;
  line-height: 1;
  display: flex;
  align-items: center;
}

.nav-btn:active {
  background: #e8e8e8;
}

/* 主按钮样式 */
.primary-btn {
  background: #667eea;
  padding: 12px 32px;
}

.primary-btn span {
  color: #ffffff;
  line-height: 1;
}

.primary-btn :deep(.van-icon) {
  color: #ffffff;
  line-height: 1;
  display: flex;
  align-items: center;
}

.primary-btn:active {
  background: #5568d3;
}

/* 删除图标按钮 */
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
  color: #ccc;
}

.delete-icon-btn:active {
  background: #f5f5f5;
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
