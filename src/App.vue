<template>
  <div id="app">
    <div class="main-content">
      <router-view v-slot="{ Component }">
        <keep-alive :include="keepAlivePages">
          <component :is="Component" />
        </keep-alive>
      </router-view>
    </div>
    <van-tabbar v-if="showTabbar" v-model="active" route fixed border placeholder>
      <van-tabbar-item replace to="/all" icon="apps-o">所有</van-tabbar-item>
      <van-tabbar-item replace to="/random" icon="fire">随机</van-tabbar-item>
      <van-tabbar-item replace to="/user" icon="user-o">我的</van-tabbar-item>
    </van-tabbar>
  </div>
</template>

<script setup>
import { ref, watch, computed, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import { Tabbar, TabbarItem } from 'vant'
import { loadUserInfo } from './store/user'

const route = useRoute()
const active = ref(0)

// 应用启动时加载用户信息
onMounted(() => {
  loadUserInfo()
})

// 在登录和注册页隐藏底部导航
const showTabbar = computed(() => {
  return !['/login', '/register'].includes(route.path)
})

// 需要缓存的页面列表
const keepAlivePages = ['All', 'Random']

// 监听路由变化来更新 active 状态
watch(() => route.path, (newPath) => {
  if (newPath.includes('/all')) active.value = 0
  else if (newPath.includes('/random')) active.value = 1
  else if (newPath.includes('/user')) active.value = 2
}, { immediate: true })
</script>

<style>
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

html, body {
  margin: 0;
  padding: 0;
  width: 100%;
  height: 100vh;
  background: #f8f9fa;
  overflow: hidden;
}

#app {
  width: 100%;
  height: 100vh;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.main-content {
  flex: 1;
  width: 100%;
  min-height: 0;
  overflow-y: auto;
  -webkit-overflow-scrolling: touch;
  /* 确保内容不会被底部的 tabbar 遮挡 */
  padding-bottom: constant(safe-area-inset-bottom);
  padding-bottom: env(safe-area-inset-bottom);
}

/* 强制覆盖 Vant Tabbar 的 z-index 确保它在最上层 */
.van-tabbar {
  z-index: 999 !important;
}
</style>
