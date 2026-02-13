<template>
  <div class="all-page">
    <div class="search-bar">
      <van-search
        v-model="searchQuery"
        placeholder="Search words..."
      />
      <van-icon name="setting-o" @click="showSortDialog = true" class="setting-icon" />
    </div>

    <div v-if="totalWords > 0" class="word-count-info">
      {{ totalWords }} words
    </div>

    <van-list
      v-model:loading="loading"
      :finished="finished"
      finished-text="No more words"
      @load="onLoad"
    >
      <van-cell
        v-for="word in displayWords"
        :key="word.word"
        is-link
        @click="goToDetail(word.word)"
      >
        <template #title>
          <span class="word">{{ word.word }}</span>
          <span class="defs">{{ word.summary }}</span>
        </template>
      </van-cell>
    </van-list>

    <!-- 排序设置弹窗 -->
    <van-dialog
      v-model:show="showSortDialog"
      title="Sort Order"
      show-cancel-button
      @confirm="applySortSettings"
    >
      <van-radio-group v-model="sortMethod">
        <van-cell-group>
          <van-cell title="Alphabetical (A-Z)" clickable @click="sortMethod = 'word_asc'">
            <template #right-icon>
              <van-radio name="word_asc" />
            </template>
          </van-cell>
          <van-cell title="Alphabetical (Z-A)" clickable @click="sortMethod = 'word_desc'">
            <template #right-icon>
              <van-radio name="word_desc" />
            </template>
          </van-cell>
          <van-cell title="Date (Oldest First)" clickable @click="sortMethod = 'time_asc'">
            <template #right-icon>
              <van-radio name="time_asc" />
            </template>
          </van-cell>
          <van-cell title="Date (Newest First)" clickable @click="sortMethod = 'time_desc'">
            <template #right-icon>
              <van-radio name="time_desc" />
            </template>
          </van-cell>
          <van-cell title="Random" clickable @click="sortMethod = 'random'">
            <template #right-icon>
              <van-radio name="random" />
            </template>
          </van-cell>
        </van-cell-group>
      </van-radio-group>
    </van-dialog>
  </div>
</template>

<script>
export default {
  name: 'All'
}
</script>

<script setup>
import { ref, onMounted, computed, watch, nextTick, onActivated } from 'vue'
import { useRouter, onBeforeRouteLeave } from 'vue-router'
import { Cell, CellGroup, Search, Icon, Dialog, Radio, RadioGroup, List, showToast } from 'vant'
import { wordAPI } from '../api'
import { currentDict as userCurrentDict } from '../store/user'

const router = useRouter()
const allWords = ref([])
const searchQuery = ref('')
const showSortDialog = ref(false)
const sortMethod = ref(localStorage.getItem('sort_method') || 'word_asc')
const loading = ref(false)
const finished = ref(false)
const page = ref(1)
const pageSize = 20
const isSearchMode = ref(false)
const searchResults = ref([])
const totalWords = ref(0)

const displayWords = computed(() => {
  return isSearchMode.value ? searchResults.value : allWords.value
})

const onLoad = async () => {
  if (isSearchMode.value) {
    // 搜索模式下不分页加载
    finished.value = true
    loading.value = false
    return
  }
  
  try {
    const response = await wordAPI.getList(userCurrentDict.value, { 
      page: page.value, 
      pageSize,
      order: sortMethod.value  // 直接使用排序方法（包括 random）
    })
    
    const newWords = response.data.words || []
    allWords.value = [...allWords.value, ...newWords]
    
    // 保存总单词数
    if (response.data.total !== undefined) {
      totalWords.value = response.data.total
    }
    
    loading.value = false
    finished.value = !response.data.hasMore
    
    if (response.data.hasMore) {
      page.value++
    }
  } catch (error) {
    console.error('Load failed:', error)
    showToast(error.response?.data?.message || error.message || 'Load failed')
    loading.value = false
    finished.value = true
  }
}

// 监听搜索框变化
watch(searchQuery, async (newVal) => {
  const query = newVal.trim()
  
  if (query) {
    // 有搜索内容
    isSearchMode.value = true
    try {
      const response = await wordAPI.getList(userCurrentDict.value, { 
        search: query, 
        order: sortMethod.value
      })
      searchResults.value = response.data.words || []
    } catch (error) {
      console.error('Search failed:', error)
    }
  } else {
    // 搜索框为空
    isSearchMode.value = false
    searchResults.value = []
    
    if (allWords.value.length === 0) {
      page.value = 1
      finished.value = false
      loading.value = false
      await nextTick()
      onLoad()
    }
  }
})

const applySortSettings = async () => {
  localStorage.setItem('sort_method', sortMethod.value)
  
  // 所有排序都由后端处理，统一重新加载
  allWords.value = []
  page.value = 1
  finished.value = false
  loading.value = false
  
  showSortDialog.value = false
  
  // 非搜索模式，重新加载列表
  if (!isSearchMode.value) {
    // 等待 DOM 更新后，手动触发加载
    await nextTick()
    onLoad()
  }
}

const goToDetail = (word) => {
  router.push(`/word/${word}`)
}

onMounted(() => {
  // 初始加载由 van-list 触发
})

// 离开页面前保存滚动位置
onBeforeRouteLeave((to, from, next) => {
  const container = document.querySelector('.all-page')
  if (container && to.path.startsWith('/word/')) {
    // 跳转到详情页时保存滚动位置
    sessionStorage.setItem('allPageScrollTop', container.scrollTop.toString())
  }
  next()
})

// 返回页面时恢复滚动位置
onActivated(() => {
  nextTick(() => {
    const scrollTop = sessionStorage.getItem('allPageScrollTop')
    if (scrollTop) {
      const container = document.querySelector('.all-page')
      if (container) {
        container.scrollTop = parseInt(scrollTop)
      }
    }
  })
})
</script>

<style scoped>
.all-page {
  background: #f8f9fa;
  height: 100%;
  overflow-y: auto;
  -webkit-overflow-scrolling: touch;
}

.search-bar {
  position: sticky;
  top: 0;
  z-index: 100;
  display: flex;
  align-items: center;
  gap: 0;
  margin-bottom: 10px;
  background: white;
}

.search-bar :deep(.van-search) {
  flex: 1;
}

.setting-icon {
  font-size: 20px;
  color: #666;
  padding: 0 16px;
  cursor: pointer;
}

.word-count-info {
  text-align: center;
  font-size: 12px;
  color: #999;
  padding: 8px 0;
  background: #f8f9fa;
}

.word {
  font-weight: 600;
  margin-right: 10px;
}

.defs {
  color: #666;
  font-size: 12px;
}
</style>
