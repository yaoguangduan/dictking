<template>
  <div class="task-detail-page">
    <van-nav-bar 
      title="单词详情" 
      left-arrow 
      @click-left="goBack" 
      fixed 
      placeholder 
      border 
    />

    <div v-if="task && wordData" class="detail-content">
      <!-- 单词头部 -->
      <div class="word-header">
        <h1 class="word-name">{{ wordData.word }}</h1>
        <div class="phonetics">
          <van-tag v-if="wordData.phonetic?.uk" type="primary" plain class="phonetic-tag">
            英 {{ wordData.phonetic.uk }}
          </van-tag>
          <van-tag v-if="wordData.phonetic?.us" type="primary" plain class="phonetic-tag">
            美 {{ wordData.phonetic.us }}
          </van-tag>
        </div>
      </div>

      <!-- 任务信息 -->
      <van-cell-group title="任务信息">
        <van-cell title="查询时间" :value="formatDate(task.created_at)" />
        <van-cell title="状态">
          <template #value>
            <van-tag :type="getStatusType(task.status)">{{ getStatusText(task.status) }}</van-tag>
          </template>
        </van-cell>
        <van-cell 
          v-if="task.status === 'ready'"
          title="录入到词典" 
          :value="selectedDictName" 
          is-link 
          @click="showDictPicker = true"
        />
      </van-cell-group>

      <!-- 词源 -->
      <div v-if="wordData.etymology" class="info-block">
        <div class="block-title">词源</div>
        <div class="block-content etymology-text">
          {{ wordData.etymology.origin }}
        </div>
      </div>

      <!-- 释义（简化显示） -->
      <div class="info-block">
        <div class="block-title">释义</div>
        <div 
          v-for="(def, index) in wordData.definitions" 
          :key="index"
          class="definition-item"
        >
          <div class="def-main">
            <van-tag type="primary" class="pos-tag">{{ def.partOfSpeech?.ch }}</van-tag>
            <span class="def-translation">{{ def.translation }}</span>
          </div>

          <!-- 显示前2个例句 -->
          <div v-if="def.sentences && def.sentences.length" class="sub-section">
            <div 
              v-for="(sentence, sIndex) in def.sentences.slice(0, 2)" 
              :key="sIndex"
              class="quote-item mini"
            >
              <div class="en">{{ sentence.en }}</div>
              <div class="zh">{{ sentence.zh }}</div>
            </div>
          </div>
        </div>
      </div>

      <!-- 助记方法 -->
      <div v-if="wordData.mnemonics && wordData.mnemonics.length" class="info-block">
        <div class="block-title">记忆技巧</div>
        <div 
          v-for="(mnemonic, index) in wordData.mnemonics.slice(0, 2)" 
          :key="index"
          class="mnemonic-item"
        >
          <van-tag type="warning" plain class="mnemonic-tag">{{ mnemonic.type }}</van-tag>
          <div class="mnemonic-content">{{ mnemonic.content }}</div>
        </div>
      </div>

      <!-- 操作按钮 -->
      <div class="action-buttons">
        <van-button 
          type="primary" 
          size="large" 
          block 
          @click="importWord"
          :loading="importing"
          v-if="task.status === 'ready'"
        >
          录入到词典
        </van-button>
        
        <van-button 
          size="large" 
          block 
          @click="deleteTask"
        >
          删除任务
        </van-button>
      </div>
    </div>

    <van-loading v-else class="loading" size="24px" vertical>
      加载中...
    </van-loading>

    <!-- 词典选择器 -->
    <van-popup v-model:show="showDictPicker" position="bottom" round>
      <van-picker
        title="选择词典"
        :columns="dictColumns"
        @confirm="onDictConfirm"
        @cancel="showDictPicker = false"
      />
    </van-popup>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { NavBar, Tag, Cell, CellGroup, Button, Loading, Popup, Picker, showToast, showConfirmDialog } from 'vant'
import { importTaskAPI, userDictionaryAPI } from '../api'
import { currentDict as userCurrentDict } from '../store/user'

const route = useRoute()
const router = useRouter()

const task = ref(null)
const importing = ref(false)
const showDictPicker = ref(false)
const dicts = ref([])
const dictColumns = ref([])
const selectedDict = ref('')

const wordData = computed(() => task.value?.word_data)

// 当前选中的词典名称（用于展示）
const selectedDictName = computed(() => {
  if (!selectedDict.value) return '请选择'
  const d = dicts.value.find(d => d.id === selectedDict.value)
  return d ? d.name : selectedDict.value
})

onMounted(() => {
  loadTask()
  loadDicts()
  // 默认选择用户当前激活的词典（等 loadDicts 后再保持或修正）
  selectedDict.value = userCurrentDict.value || 'defaults'
})

const loadDicts = async () => {
  try {
    const response = await userDictionaryAPI.getAll()
    const list = response.data?.dicts ?? []
    dicts.value = list
    dictColumns.value = list.map(dict => ({ text: dict.name, value: dict.id }))
    // 若当前选中的 id 不在列表中，选第一个
    if (dicts.value.length && !dicts.value.some(d => d.id === selectedDict.value)) {
      selectedDict.value = dicts.value[0].id
    }
  } catch (error) {
    console.error('加载词典列表失败:', error)
    showToast('加载词典列表失败')
  }
}

const loadTask = async () => {
  const taskId = route.params.id
  try {
    const response = await importTaskAPI.getDetail(taskId)
    task.value = response.data.task
    if (!task.value.word_data) {
      console.error('单词数据不完整')
      showToast('单词数据不完整')
      router.back()
    }
  } catch (error) {
    console.error('加载失败:', error)
    showToast('加载失败: ' + (error.message || '未知错误'))
    router.back()
  }
}

const onDictConfirm = ({ selectedOptions }) => {
  selectedDict.value = selectedOptions[0].value
  showDictPicker.value = false
}

const doImport = async () => {
  if (!task.value?.id || !selectedDict.value) return
  try {
    importing.value = true
    showToast('正在录入...')
    await importTaskAPI.import(task.value.id, selectedDict.value)
    showToast('录入成功')
    router.replace('/import-word')
  } catch (error) {
    const msg = error?.response?.data?.message || error?.message || '录入失败'
    showToast(msg)
  } finally {
    importing.value = false
  }
}

const importWord = () => {
  if (!selectedDict.value) {
    showToast('请先选择目标词典')
    return
  }
  if (!task.value?.id || !wordData.value) {
    showToast('任务数据不完整')
    return
  }
  showConfirmDialog({
    title: '确认录入',
    message: `确定要将单词「${wordData.value.word}」录入到词典「${selectedDictName.value}」吗？`,
  })
    .then(() => {
      doImport()
    })
    .catch(() => {
      // 用户点击了取消，不提示
    })
}

const deleteTask = async () => {
  try {
    await showConfirmDialog({
      title: '确认删除',
      message: '确定要删除这个任务吗？',
    })
    
    await importTaskAPI.delete(task.value.id)
    
    showToast('已删除')
    router.back()
    
  } catch (error) {
    if (error !== 'cancel') {
      showToast('删除失败')
    }
  }
}

const getStatusType = (status) => {
  const types = {
    querying: 'default',
    ready: 'primary',
    imported: 'success',
    failed: 'danger'
  }
  return types[status] || 'default'
}

const getStatusText = (status) => {
  const texts = {
    querying: '查询中',
    ready: '待录入',
    imported: '已录入',
    failed: '失败'
  }
  return texts[status] || status
}

const formatDate = (dateStr) => {
  const date = new Date(dateStr)
  return date.toLocaleString('zh-CN')
}

const goBack = () => {
  router.back()
}
</script>

<style scoped>
.task-detail-page {
  min-height: 100vh;
  background: #f5f5f5;
  overflow-y: auto;
}

.detail-content {
  padding-bottom: 100px;
}

.word-header {
  padding: 20px 16px;
  background: white;
  border-bottom: 8px solid #f5f5f5;
}

.word-name {
  font-size: 28px;
  font-weight: 700;
  color: #333;
  margin-bottom: 12px;
}

.phonetics {
  display: flex;
  gap: 12px;
  flex-wrap: wrap;
}

.phonetic-tag {
  padding: 4px 10px;
  font-size: 13px;
}

.info-block {
  padding: 16px;
  background: white;
  border-bottom: 8px solid #f5f5f5;
}

.block-title {
  font-size: 14px;
  font-weight: 600;
  color: #333;
  margin-bottom: 12px;
  padding-bottom: 8px;
  border-bottom: 1px solid #eee;
}

.block-content {
  font-size: 14px;
  color: #666;
  line-height: 1.6;
}

.etymology-text {
  color: #666;
}

.definition-item {
  margin-bottom: 16px;
  padding-bottom: 16px;
  border-bottom: 1px solid #f0f0f0;
}

.definition-item:last-child {
  margin-bottom: 0;
  border-bottom: none;
}

.def-main {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 10px;
}

.pos-tag {
  font-weight: 600;
}

.def-translation {
  font-size: 15px;
  font-weight: 600;
  color: #333;
}

.sub-section {
  margin-top: 10px;
}

.quote-item.mini {
  padding: 10px;
  margin-bottom: 8px;
  background: #fafafa;
  border-left: 3px solid #1989fa;
  border-radius: 4px;
}

.quote-item .en {
  font-size: 14px;
  color: #333;
  line-height: 1.6;
  margin-bottom: 6px;
}

.quote-item .zh {
  font-size: 13px;
  color: #999;
}

.mnemonic-item {
  margin-bottom: 12px;
  padding: 10px;
  background: #fafafa;
  border-radius: 4px;
}

.mnemonic-tag {
  margin-bottom: 8px;
}

.mnemonic-content {
  font-size: 14px;
  color: #666;
  line-height: 1.6;
}

.action-buttons {
  padding: 16px;
  background: white;
  display: flex;
  flex-direction: column;
  gap: 12px;
  border-top: 8px solid #f5f5f5;
}

.loading {
  display: flex;
  justify-content: center;
  padding: 100px 0;
}

:deep(.van-cell-group) {
  margin: 0;
  border-bottom: 8px solid #f5f5f5;
}
</style>
