<template>
  <div class="register-page">
    <van-nav-bar
      title="Sign Up"
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
          label="Username"
          placeholder="3-20 characters"
          :rules="[
            { required: true, message: 'Please enter username' },
            { pattern: /^.{3,20}$/, message: 'Username must be 3-20 characters' }
          ]"
        />
        <van-field
          v-model="password"
          type="password"
          name="password"
          label="Password"
          placeholder="Enter password"
          :rules="[{ required: true, message: 'Please enter password' }]"
        />
        <van-field
          v-model="confirmPassword"
          type="password"
          name="confirmPassword"
          label="Confirm Password"
          placeholder="Re-enter password"
          :rules="[
            { required: true, message: 'Please re-enter password' },
            { validator: validatePassword, message: 'Passwords don\'t match' }
          ]"
        />
      </van-cell-group>

      <div class="register-actions">
        <van-button block type="primary" native-type="submit" :loading="loading">
          Sign Up
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
    showToast('Passwords don\'t match');
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
    
    showToast('Registration successful');
    router.replace('/');
  } catch (error: any) {
    console.error('Register error:', error);
    const errorMsg = error.response?.data?.message || error.message || 'Registration failed';
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
