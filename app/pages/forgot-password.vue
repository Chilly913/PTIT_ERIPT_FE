<script setup lang="ts">
definePageMeta({ layout: 'auth' })

const email = ref('')
const loading = ref(false)
const error = ref('')
const sent = ref(false)

async function submit() {
  error.value = ''
  if (!email.value.trim()) {
    error.value = 'Vui lòng nhập email.'
    return
  }
  loading.value = true
  try {
    await useApi('/auth/forgot-password', {
      method: 'POST',
      body: { email: email.value.trim() },
      token: null,
    })
    sent.value = true
  }
  catch (requestError: any) {
    error.value = requestError?.data?.message || 'Không thể gửi email đặt lại mật khẩu.'
  }
  finally {
    loading.value = false
  }
}
</script>

<template>
  <div class="auth-panel">
    <div class="auth-card">
      <div class="auth-card-scroll">
        <div class="auth-brand">
          <img class="auth-brand-img" src="/images/logo.png" alt="Logo" />
          <div class="auth-brand-text">
            ERIPT LMS
            <small>University Name &amp; Logo</small>
          </div>
        </div>

        <div class="auth-heading">
          <span>Khôi phục tài khoản</span>
          <h2>Quên mật khẩu?</h2>
          <p>Nhập email đã đăng ký, chúng tôi sẽ gửi liên kết đặt lại mật khẩu.</p>
        </div>

        <div v-if="error" class="notice">{{ error }}</div>

        <div v-if="sent" class="success-state">
          <i class="pi pi-envelope" />
          <h3>Đã gửi hướng dẫn</h3>
          <p>Nếu email tồn tại trong hệ thống, bạn sẽ nhận được liên kết đặt lại mật khẩu trong vài phút.</p>
          <Button label="Quay lại đăng nhập" icon="pi pi-arrow-left" @click="navigateTo('/login')" />
        </div>

        <template v-else>
          <form class="auth-form" @submit.prevent="submit">
            <label>
              <span>Email</span>
              <span class="auth-field-uni">University Name</span>
              <InputText v-model="email" type="email" placeholder="email@example.com" autocomplete="email" autoFocus />
              <span class="auth-field-desc">Chúng tôi sẽ gửi hướng dẫn đặt lại mật khẩu tới địa chỉ này.</span>
            </label>
            <Button type="submit" label="Gửi liên kết đặt lại" icon="pi pi-send" :loading="loading" />
          </form>
          <p class="auth-foot">Nhớ lại mật khẩu? <NuxtLink to="/login">Đăng nhập</NuxtLink></p>
        </template>

        <div class="auth-brand-footer">
          <span>ERIPT LMS</span> · University Name &amp; Logo
        </div>
      </div>
    </div>
  </div>
</template>
