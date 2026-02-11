<template>
  <div class="import-word-page">
    <van-nav-bar 
      title="AI单词录入" 
      left-arrow 
      @click-left="goBack" 
      fixed 
      placeholder 
      border 
    />

    <!-- 输入区域 -->
    <div class="input-section">
      <van-field
        v-model="inputWord"
        placeholder="输入要查询的单词"
        clearable
        @keyup.enter="createTask"
      />
    </div>

    <!-- 任务列表 -->
    <div class="tasks-section">
      <!-- 统计（紧凑一行显示） -->
      <div class="stats-compact">
        <span class="stat-compact">查询中 <van-tag type="default" size="small">{{ stats.querying }}</van-tag></span>
        <span class="stat-compact">待录入 <van-tag type="primary" size="small">{{ stats.ready }}</van-tag></span>
        <span class="stat-compact">已录入 <van-tag type="success" size="small">{{ stats.imported }}</van-tag></span>
        <span class="stat-compact">失败 <van-tag type="danger" size="small">{{ stats.failed }}</van-tag></span>
      </div>

      <!-- 任务列表（可滚动） -->
      <div class="task-list-container">
        <van-cell-group class="task-list">
          <van-cell
            v-for="task in tasks"
            :key="task.id"

            :label="false"
            @click="handleTaskClick(task)"
            is-link
          >
            <template #title>
              <div class="task-title-row">
                <span class="task-word">{{ task.word }}</span>
                <span class="task-time">{{ formatDate(task.created_at) }}</span>
              </div>
            </template>
            <template #value>
              <van-tag :type="getStatusType(task.status)" size="small" style="margin-left: 6px">
                {{ getStatusText(task.status) }}
              </van-tag>
              <van-loading v-if="task.status === 'querying'" size="14px" style="margin-left: 6px" />
            </template>
          </van-cell>
        </van-cell-group>
        
        <van-empty v-if="tasks.length === 0 && !loading" description="暂无任务" />
      </div>
    </div>

    <!-- 底部操作按钮 -->
    <div class="bottom-actions">
      <van-button type="primary" size="small" @click="createTask" :loading="creating">
        创建任务
      </van-button>
      <van-button size="small" @click="showBatchDialog = true">
        批量查询
      </van-button>
    </div>

    <!-- 批量录入弹窗 -->
    <van-dialog
      v-model:show="showBatchDialog"
      title="批量录入"
      show-cancel-button
      @confirm="batchCreate"
    >
      <van-field
        v-model="batchWords"
        type="textarea"
        placeholder="每行一个单词"
        rows="10"
        :autosize="{ minHeight: 150 }"
      />
    </van-dialog>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import { NavBar, Field, Button, Cell, CellGroup, Tag, Dialog, Empty, Loading, showToast } from 'vant'
import { importTaskAPI } from '../api'

const router = useRouter()

const inputWord = ref('')
const creating = ref(false)
const showBatchDialog = ref(false)
const batchWords = ref('')
const loading = ref(false)
const tasks = ref([])
const stats = ref({
  querying: 0,
  ready: 0,
  imported: 0,
  failed: 0
})

let refreshTimer = null

onMounted(() => {
  loadTasks()
  loadStats()
  
  // 每5秒自动刷新
  refreshTimer = setInterval(() => {
    loadTasks(true).catch(err => {
      console.error('自动刷新任务列表失败:', err)
    })
    loadStats().catch(err => {
      console.error('自动刷新统计失败:', err)
    })
  }, 5000)
})

// 组件卸载时清理定时器
onUnmounted(() => {
  if (refreshTimer) {
    clearInterval(refreshTimer)
    refreshTimer = null
  }
})

const createTask = async () => {
  if (!inputWord.value.trim()) {
    showToast('请输入单词')
    return
  }
  
  creating.value = true
  try {
    await importTaskAPI.create(inputWord.value.trim())
    showToast('任务已创建，正在查询中...')
    inputWord.value = ''
    loadTasks()
    loadStats()
  } catch (error) {
    showToast(error.response?.data?.message || error.message || '创建任务失败')
  } finally {
    creating.value = false
  }
}

const loadTasks = async (silent = false) => {
  if (!silent) {
    loading.value = true
  }
  
  try {
    const response = await importTaskAPI.getList()
    tasks.value = response.data.tasks || []
  } catch (error) {
    if (!silent) {
      showToast('加载任务列表失败')
    }
  } finally {
    loading.value = false
  }
}

const loadStats = async () => {
  try {
    const response = await importTaskAPI.getStats()
    stats.value = response.data || {
      querying: 0,
      ready: 0,
      imported: 0,
      failed: 0
    }
  } catch (error) {
    console.error('加载统计失败:', error)
  }
}

const handleTaskClick = (task) => {
  if (task.status === 'ready') {
    // 跳转到详情页
    router.push(`/import-task/${task.id}`)
  } else if (task.status === 'failed') {
    showToast(task.error_message || '查询失败')
  } else if (task.status === 'querying') {
    showToast('正在查询中，请稍候...')
  }
}

const batchCreate = async () => {
  const words = batchWords.value.split('\n')
    .map(w => w.trim())
    .filter(w => w.length > 0)
  
  if (words.length === 0) {
    showToast('请输入单词')
    return
  }
  
  if (words.length > 50) {
    showToast('单次最多查询50个单词')
    return
  }
  
  try {
    const response = await importTaskAPI.batchCreate(words)
    const { created, existing, failed } = response.data.results
    
    showToast(`成功创建 ${created.length} 个任务\n已存在 ${existing.length} 个\n失败 ${failed.length} 个`)
    batchWords.value = ''
    showBatchDialog.value = false
    loadTasks()
    loadStats()
  } catch (error) {
    showToast('批量创建失败')
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
  const now = new Date()
  const diff = now - date
  
  if (diff < 60000) return '刚刚'
  if (diff < 3600000) return `${Math.floor(diff / 60000)}分钟前`
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}小时前`
  return date.toLocaleDateString('zh-CN')
}

const goBack = () => {
  router.back()
}
</script>

<style scoped>
.import-word-page {
  min-height: 100vh;
  background: #f5f5f5;
  padding-bottom: 120px;
}

.input-section {
  background: white;
  border-bottom: 1px solid #eee;
}

.tasks-section {
  background: white;
}

.stats-compact {
  display: flex;
  justify-content: space-around;
  align-items: center;
  padding: 12px 16px;
  background: white;
  border-bottom: 1px solid #eee;
  font-size: 12px;
  color: #666;
}

.stat-compact {
  display: flex;
  align-items: center;
  gap: 4px;
}

.task-list-container {
  max-height: calc(100vh - 280px);
  overflow-y: auto;
}

.task-list {
  background: white;
}

.task-title-row {
  display: flex;
  justify-content: space-between; /* 左右两端对齐 */
  align-items: center;
  width: 100%; /* 确保占据整个宽度 */
}

.task-word {
  font-size: 15px;
  font-weight: 500;
  color: #333;
}

.task-time {
  font-size: 12px;
  color: #999;
}

.task-time {
  font-size: 12px;
  color: #999;
}

.bottom-actions {
  position: fixed;
  bottom: 50px;
  left: 0;
  right: 0;
  background: white;
  padding: 12px 16px;
  display: flex;
  gap: 12px;
  box-shadow: 0 -2px 8px rgba(0, 0, 0, 0.06);
  z-index: 999;
  border-top: 1px solid #eee;
}

.bottom-actions .van-button {
  flex: 1;
}
</style>
