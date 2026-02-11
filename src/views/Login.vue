<template>
  <div class="login-page">
    <div class="login-header">
      <h1>DictKing</h1>
    </div>

    <van-form @submit="onSubmit">
      <van-cell-group>
        <van-field
          v-model="username"
          name="username"
          label="用户名"
          placeholder="请输入用户名"
          :rules="[{ required: true, message: '请输入用户名' }]"
        />
        <van-field
          v-model="password"
          type="password"
          name="password"
          label="密码"
          placeholder="请输入密码"
          :rules="[{ required: true, message: '请输入密码' }]"
        />
      </van-cell-group>

      <div class="login-actions">
        <van-button block type="primary" native-type="submit" :loading="loading">
          登录
        </van-button>
        <van-button block plain type="primary" @click="goRegister" style="margin-top: 12px;">
          注册账号
        </van-button>
      </div>
    </van-form>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { useRouter } from 'vue-router';
import { showToast } from 'vant';
import { authAPI } from '../api';
import { setUserInfo } from '../store/user';

const router = useRouter();

const username = ref('');
const password = ref('');
const loading = ref(false);

const onSubmit = async () => {
  loading.value = true;
  try {
    const response = await authAPI.login(username.value, password.value);
    const { token, user } = response.data;
    
    // 保存 token 和用户信息
    localStorage.setItem('auth_token', token);
    localStorage.setItem('user_info', JSON.stringify(user));
    
    // 直接设置用户信息到 store
    setUserInfo(user);
    
    showToast('登录成功');
    router.replace('/');
  } catch (error: any) {
    console.error('Login error:', error);
    showToast(error.response?.data?.message || error.message || '登录失败');
  } finally {
    loading.value = false;
  }
};

const goRegister = () => {
  router.push('/register');
};
</script>

<style scoped>
.login-page {
  min-height: 100vh;
  padding: 80px 16px 20px;
  background: #f7f8fa;
}

.login-header {
  text-align: center;
  margin-bottom: 40px;
}

.login-header h1 {
  font-size: 32px;
  font-weight: 600;
  color: #323233;
  margin: 0;
}

.login-actions {
  padding: 20px 16px;
}
</style>
