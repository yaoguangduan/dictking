<template>
  <div class="articles-page">
    <div class="search-bar">
      <van-search
        v-model="searchQuery"
        placeholder="Search articles..."
      />
      <div class="difficulty-filter" @click="showDifficultyPicker = true">
        <span class="filter-text">{{ currentFilterLabel }}</span>
        <van-icon name="arrow-down" size="12" />
      </div>
    </div>

    <div v-if="totalArticles > 0" class="article-count-info">
      {{ totalArticles }} articles
    </div>

    <van-list
      v-model:loading="loading"
      :finished="finished"
      finished-text="No more articles"
      @load="onLoad"
    >
      <van-cell
        v-for="article in displayArticles"
        :key="article.id"
        is-link
        @click="goToDetail(article.id)"
      >
        <template #title>
          <div class="article-item">
            <div class="item-title">{{ article.title }}</div>
            <div v-if="article.title_cn" class="item-title-cn">{{ article.title_cn }}</div>
            <div class="item-meta">
              <van-tag
                :type="difficultyType(article.difficulty)"
                plain
                size="small"
                class="diff-tag"
              >
                {{ difficultyLabel(article.difficulty) }}
              </van-tag>
              <span v-for="tag in article.tags.slice(0, 2)" :key="tag" class="meta-tag">{{ tag }}</span>
              <span class="meta-date">{{ formatDate(article.created_at) }}</span>
            </div>
          </div>
        </template>
      </van-cell>
    </van-list>

    <!-- 空状态 -->
    <van-empty
      v-if="!loading && finished && displayArticles.length === 0"
      image="search"
      description="No articles found"
    />

    <!-- 难度筛选弹窗 -->
    <van-action-sheet
      v-model:show="showDifficultyPicker"
      :actions="difficultyActions"
      cancel-text="Cancel"
      @select="onDifficultySelect"
    />
  </div>
</template>

<script>
export default {
  name: 'Articles'
}
</script>

<script setup>
import { ref, computed, watch, nextTick, onActivated } from 'vue'
import { useRouter, onBeforeRouteLeave } from 'vue-router'
import { Search, List, Tag, Icon, Empty, Cell, ActionSheet, showToast } from 'vant'
import { articleAPI } from '../api'

const router = useRouter()
const allArticles = ref([])
const searchQuery = ref('')
const loading = ref(false)
const finished = ref(false)
const page = ref(1)
const pageSize = 20
const isSearchMode = ref(false)
const searchResults = ref([])
const totalArticles = ref(0)
const difficultyFilter = ref('')
const showDifficultyPicker = ref(false)

const difficultyActions = [
  { name: 'All', value: '' },
  { name: 'Easy', value: 'easy' },
  { name: 'Medium', value: 'medium' },
  { name: 'Hard', value: 'hard' },
]

const currentFilterLabel = computed(() => {
  if (!difficultyFilter.value) return 'Level'
  const map = { easy: 'Easy', medium: 'Medium', hard: 'Hard' }
  return map[difficultyFilter.value] || 'Level'
})

const displayArticles = computed(() => {
  const list = isSearchMode.value ? searchResults.value : allArticles.value
  if (!difficultyFilter.value) return list
  return list.filter(a => a.difficulty === difficultyFilter.value)
})

const onLoad = async () => {
  if (isSearchMode.value) {
    finished.value = true
    loading.value = false
    return
  }

  try {
    const response = await articleAPI.getList({
      page: page.value,
      pageSize,
    })

    const newArticles = response.data.articles || []
    allArticles.value = [...allArticles.value, ...newArticles]

    if (response.data.total !== undefined) {
      totalArticles.value = response.data.total
    }

    loading.value = false
    finished.value = !response.data.hasMore

    if (response.data.hasMore) {
      page.value++
    }
  } catch (error) {
    console.error('Failed to load articles:', error)
    showToast(error.response?.data?.message || error.message || 'Load failed')
    loading.value = false
    finished.value = true
  }
}

// 搜索
watch(searchQuery, async (newVal) => {
  const query = newVal.trim()
  if (query) {
    isSearchMode.value = true
    try {
      const response = await articleAPI.getList({
        search: query,
        page: 1,
        pageSize: 100,
      })
      searchResults.value = response.data.articles || []
    } catch (error) {
      console.error('Search failed:', error)
    }
  } else {
    isSearchMode.value = false
    searchResults.value = []
    if (allArticles.value.length === 0) {
      page.value = 1
      finished.value = false
      loading.value = false
      await nextTick()
      onLoad()
    }
  }
})

const onDifficultySelect = (action) => {
  difficultyFilter.value = action.value
  showDifficultyPicker.value = false
}

const difficultyLabel = (level) => {
  const map = { easy: 'Easy', medium: 'Medium', hard: 'Hard' }
  return map[level] || 'Medium'
}

const difficultyType = (level) => {
  const map = { easy: 'success', medium: 'warning', hard: 'danger' }
  return map[level] || 'warning'
}

const formatDate = (dateStr) => {
  if (!dateStr) return ''
  const d = new Date(dateStr)
  const now = new Date()
  const diff = now.getTime() - d.getTime()
  const days = Math.floor(diff / (1000 * 60 * 60 * 24))
  if (days === 0) return 'Today'
  if (days === 1) return 'Yesterday'
  if (days < 7) return `${days}d ago`
  if (days < 30) return `${Math.floor(days / 7)}w ago`
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

const goToDetail = (id) => {
  router.push(`/article/${id}`)
}

// 离开页面前保存滚动位置
onBeforeRouteLeave((to, from, next) => {
  const container = document.querySelector('.articles-page')
  if (container && to.path.startsWith('/article/')) {
    sessionStorage.setItem('articlesPageScrollTop', container.scrollTop.toString())
  }
  next()
})

// 返回时恢复滚动位置
onActivated(() => {
  nextTick(() => {
    const scrollTop = sessionStorage.getItem('articlesPageScrollTop')
    if (scrollTop) {
      const container = document.querySelector('.articles-page')
      if (container) {
        container.scrollTop = parseInt(scrollTop)
      }
    }
  })
})
</script>

<style scoped>
.articles-page {
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
  background: white;
}

.search-bar :deep(.van-search) {
  flex: 1;
}

.difficulty-filter {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 0 16px 0 0;
  cursor: pointer;
  white-space: nowrap;
  font-size: 13px;
  color: #666;
  font-weight: 500;
}

.filter-text {
  color: #667eea;
}

.article-count-info {
  text-align: center;
  font-size: 12px;
  color: #999;
  padding: 8px 0 4px;
}

.article-item {
  padding: 4px 0;
}

.item-title {
  font-size: 15px;
  font-weight: 600;
  color: #1a1a1a;
  line-height: 1.45;
  margin-bottom: 4px;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.item-title-cn {
  font-size: 13px;
  color: #666;
  line-height: 1.4;
  margin-bottom: 8px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.item-meta {
  display: flex;
  align-items: center;
  gap: 8px;
}

.diff-tag {
  font-weight: 600;
  font-size: 10px;
  flex-shrink: 0;
}

.meta-tag {
  font-size: 11px;
  color: #8b949e;
}

.meta-tag::before {
  content: '#';
}

.meta-date {
  font-size: 11px;
  color: #c0c4cc;
  white-space: nowrap;
}

/* Vertically center the van-cell right arrow */
:deep(.van-cell) {
  align-items: center;
}

:deep(.van-cell__right-icon) {
  align-self: center;
}
</style>
