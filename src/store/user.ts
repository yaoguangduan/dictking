/**
 * 用户状态管理 — 适配 RestBase
 */
import { ref, computed } from 'vue'
import { authAPI } from '../api'

// 用户信息
const userInfo = ref<any>(null)
const isLoading = ref(false)

// 当前词典 ID
export const currentDict = computed(() => userInfo.value?.current_dict || 'defaults')

// 加载用户信息（从 RestBase /api/auth/profile 获取）
export async function loadUserInfo() {
  if (isLoading.value) return

  const token = localStorage.getItem('auth_token')
  if (!token) {
    userInfo.value = null
    return
  }

  try {
    isLoading.value = true
    const response = await authAPI.getMe()
    userInfo.value = response.data.user
  } catch (error) {
    console.error('加载用户信息失败:', error)
    userInfo.value = null
  } finally {
    isLoading.value = false
  }
}

// 更新当前词典
export async function updateCurrentDict(dictId: string) {
  try {
    await authAPI.updateCurrentDict(dictId)
    if (userInfo.value) {
      userInfo.value.current_dict = dictId
    }
  } catch (error) {
    console.error('更新词典失败:', error)
    throw error
  }
}

// 清除用户信息
export function clearUserInfo() {
  userInfo.value = null
}

// 直接设置用户信息（用于登录/注册后）
export function setUserInfo(user: any) {
  userInfo.value = user
}

// 导出用户信息（只读）
export { userInfo }
