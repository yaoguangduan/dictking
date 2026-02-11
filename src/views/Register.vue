<template>
  <div class="register-page">
    <van-nav-bar
      title="注册"
      left-arrow
      @click-left="router.back()"
      fixed
      placeholder
    />

    <van-form @submit="onSubmit">
      <van-cell-group>
        <van-field
          v-model="username"
          name="username"
          label="用户名"
          placeholder="3-20个字符"
          :rules="[
            { required: true, message: '请输入用户名' },
            { pattern: /^.{3,20}$/, message: '用户名长度为3-20个字符' }
          ]"
        />
        <van-field
          v-model="password"
          type="password"
          name="password"
          label="密码"
          placeholder="请输入密码"
          :rules="[{ required: true, message: '请输入密码' }]"
        />
        <van-field
          v-model="confirmPassword"
          type="password"
          name="confirmPassword"
          label="确认密码"
          placeholder="再次输入密码"
          :rules="[
            { required: true, message: '请再次输入密码' },
            { validator: validatePassword, message: '两次密码不一致' }
          ]"
        />
      </van-cell-group>

      <div class="register-actions">
        <van-button block type="primary" native-type="submit" :loading="loading">
          注册
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
const confirmPassword = ref('');
const loading = ref(false);

const validatePassword = () => {
  return password.value === confirmPassword.value;
};

const onSubmit = async () => {
  if (!validatePassword()) {
    showToast('两次密码不一致');
    return;
  }

  loading.value = true;
  try {
    const response = await authAPI.register(username.value, password.value);
    const { token, user } = response.data;
    
    // 保存 token 和用户信息
    localStorage.setItem('auth_token', token);
    localStorage.setItem('user_info', JSON.stringify(user));
    
    // 直接设置用户信息到 store
    setUserInfo(user);
    
    showToast('注册成功');
    router.replace('/');
  } catch (error: any) {
    console.error('Register error:', error);
    const errorMsg = error.response?.data?.message || error.message || '注册失败';
    showToast(errorMsg);
  } finally {
    loading.value = false;
  }
};
</script>

<style scoped>
.register-page {
  min-height: 100vh;
  padding: 20px 0;
  background: #f7f8fa;
}

.register-actions {
  padding: 20px 16px;
}
</style>
