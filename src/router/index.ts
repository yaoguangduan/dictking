import { createRouter, createWebHistory, RouteRecordRaw } from 'vue-router'
import Login from '../views/Login.vue'
import Register from '../views/Register.vue'
import Random from '../views/Random.vue'
import All from '../views/All.vue'
import WordDetail from '../views/WordDetail.vue'
import User from '../views/User.vue'
import WordCloudSentences from '../views/WordCloudSentences.vue'
import Articles from '../views/Articles.vue'
import ArticleDetail from '../views/ArticleDetail.vue'

const routes: Array<RouteRecordRaw> = [
  {
    path: '/login',
    name: 'Login',
    component: Login,
    meta: { public: true }
  },
  {
    path: '/register',
    name: 'Register',
    component: Register,
    meta: { public: true }
  },
  {
    path: '/',
    redirect: '/all'
  },
  {
    path: '/random',
    name: 'Random',
    component: Random,
    meta: { keepAlive: true }
  },
  {
    path: '/all',
    name: 'All',
    component: All,
    meta: { keepAlive: true }
  },
  {
    path: '/user',
    name: 'User',
    component: User
  },
  {
    path: '/word-cloud-sentences',
    name: 'WordCloudSentences',
    component: WordCloudSentences
  },
  {
    path: '/word/:word',
    name: 'WordDetail',
    component: WordDetail
  },
  {
    path: '/articles',
    name: 'Articles',
    component: Articles,
    meta: { keepAlive: true }
  },
  {
    path: '/article/:id',
    name: 'ArticleDetail',
    component: ArticleDetail
  }
]

const router = createRouter({
  history: createWebHistory(),
  routes,
  scrollBehavior(to, from, savedPosition) {
    if (savedPosition) {
      // 浏览器后退/前进时，返回保存的位置
      return savedPosition
    } else {
      // 默认滚动到顶部
      return { top: 0 }
    }
  }
})

// 全局路由守卫：统一处理登录验证
router.beforeEach((to, from, next) => {
  const token = localStorage.getItem('auth_token')
  const isPublicRoute = to.meta?.public // 使用可选链操作符
  
  // 未登录且访问需要认证的页面
  if (!token && !isPublicRoute) {
    next('/login')
    return
  }
  
  // 已登录但访问登录/注册页，重定向到首页
  if (token && isPublicRoute) {
    next('/')
    return
  }
  
  // 其他情况正常放行
  next()
})

export default router
