<template>
  <div class="user-page">
    <van-nav-bar title="Profile" border fixed placeholder />
    
    <div class="content">
      <!-- 用户信息 -->
      <van-cell-group title="Account" class="cell-group-section">
        <van-cell title="Username" :value="username">
          <template #icon>
            <van-icon name="user-o" class="cell-icon" />
          </template>
        </van-cell>
        <van-cell title="Registered" :value="formatDate(createdAt)" v-if="createdAt">
          <template #icon>
            <van-icon name="clock-o" class="cell-icon" />
          </template>
        </van-cell>
      </van-cell-group>

      <!-- 词库设置 -->
      <van-cell-group title="Dictionary" class="cell-group-section">
        <van-cell 
          title="Current Dictionary" 
          :value="currentDict" 
          is-link 
          @click="showDictPicker = true"
        >
          <template #icon>
            <van-icon name="description" class="cell-icon" />
          </template>
        </van-cell>
      </van-cell-group>

      <!-- 词汇增强 -->
      <van-cell-group title="Vocabulary" class="cell-group-section">
        <van-cell 
          title="Word Cloud Sentences" 
          label="Complex sentences with learned words for memory reinforcement" 
          is-link 
          @click="goToWordCloud"
        >
          <template #icon>
            <van-icon name="cluster-o" class="cell-icon" />
          </template>
        </van-cell>
      </van-cell-group>

      <!-- 退出登录 -->
      <van-cell-group class="cell-group-section">
        <van-cell 
          title="Log Out" 
          is-link 
          @click="logout"
          title-class="logout-text"
        >
          <template #icon>
            <van-icon name="warning-o" class="cell-icon logout-icon" />
          </template>
        </van-cell>
      </van-cell-group>
    </div>

    <!-- 词库选择弹窗 -->
    <van-popup v-model:show="showDictPicker" position="bottom" round>
      <van-picker
        title="Select Dictionary"
        :columns="dictColumns"
        @confirm="onDictConfirm"
        @cancel="showDictPicker = false"
      />
    </van-popup>
  </div>
</template>

<script setup>
import { ref, onMounted, computed } from 'vue'
import { useRouter } from 'vue-router'
import { NavBar, Cell, CellGroup, Icon, showConfirmDialog, Popup, Picker, showToast } from 'vant'
import { dictionaryAPI } from '../api'
import { currentDict as userCurrentDict, updateCurrentDict } from '../store/user'

const router = useRouter()
const username = ref('')
const createdAt = ref('')
const showDictPicker = ref(false)
const dicts = ref([])
const dictColumns = ref([])

// 使用 computed 来响应式地获取当前词典
const currentDict = computed(() => userCurrentDict.value)

onMounted(() => {
  const userInfo = localStorage.getItem('user_info')
  if (userInfo) {
    const user = JSON.parse(userInfo)
    username.value = user.username
    createdAt.value = user.created_at
  }
  loadDicts()
})

const formatDate = (dateStr) => {
  if (!dateStr) return ''
  const date = new Date(dateStr)
  return date.toLocaleDateString('en-US')
}

const loadDicts = async () => {
  try {
    const response = await dictionaryAPI.getAll()
    const data = response.data || []
    dicts.value = data
    dictColumns.value = data.map(dict => ({ text: dict.name, value: dict.id }))
  } catch (error) {
    console.error('Failed to load dictionaries:', error)
    showToast(error.response?.data?.message || error.message || 'Failed to load dictionaries')
  }
}

const onDictConfirm = async ({ selectedOptions }) => {
  const newDict = selectedOptions[0].value
  try {
    await updateCurrentDict(newDict)
    showDictPicker.value = false
    showToast(`Switched to: ${newDict}`)
    // 触发全局刷新或通知其他页面
    window.location.reload() 
  } catch (error) {
    showToast(error.response?.data?.message || error.message || 'Switch failed')
  }
}

const goToWordCloud = () => {
  router.push('/word-cloud-sentences')
}

const logout = async () => {
  showConfirmDialog({
    title: 'Log Out',
    message: 'Are you sure you want to log out?',
  }).then(() => {
    localStorage.removeItem('auth_token')
    localStorage.removeItem('user_info')
    router.replace('/login')
  }).catch(() => {
    // 取消
  })
}
</script>

<style scoped>
.user-page {
  height: 100%;
  background: #f7f8fa;
}

.content {
  padding: 16px 0;
}

.cell-group-section {
  margin-bottom: 24px;
}

.cell-group-section:last-child {
  margin-bottom: 0;
}

/* 调整标题和内容的间距 */
:deep(.van-cell-group__title) {
  padding-top: 0;
  padding-bottom: 8px;
}

.cell-icon {
  margin-right: 12px;
  font-size: 18px;
  display: flex;
  align-items: center;
}

.logout-icon {
  color: #ee0a24;
}

:deep(.logout-text) {
  color: #ee0a24;
}
</style>
