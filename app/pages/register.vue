<script setup lang="ts">
definePageMeta({ layout: 'auth' })

const auth = useAuthStore()
const loading = ref(false)
const error = ref('')
const agreed = ref(false)
const form = reactive({
  name: '',
  email: '',
  password: '',
  password_confirmation: '',
})

async function submit() {
  error.value = ''
  if (!form.name.trim() || !form.email.trim()) {
    error.value = 'Vui lòng nhập họ tên và email.'
    return
  }
  if (form.password.length < 6) {
    error.value = 'Mật khẩu phải có ít nhất 6 ký tự.'
    return
  }
  if (form.password !== form.password_confirmation) {
    error.value = 'Mật khẩu xác nhận không khớp.'
    return
  }
  if (!agreed.value) {
    error.value = 'Vui lòng đồng ý điều khoản trước khi tạo tài khoản.'
    return
  }

  loading.value = true
  try {
    const result = await auth.register(form)
    await navigateTo(`/verify-email?email=${encodeURIComponent(result.email)}&registered=1`)
  }
  catch (requestError: any) {
    error.value = requestError?.data?.message || 'Đăng ký thất bại. Vui lòng thử lại.'
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
          <span>Đăng ký</span>
          <h2>Tạo tài khoản mới</h2>
          <p>Điền thông tin bên dưới để bắt đầu học tập trên ERIPT LMS.</p>
        </div>

        <div v-if="error" class="notice">{{ error }}</div>

        <form class="auth-form" @submit.prevent="submit">
          <label>
            <span>Họ và tên</span>
            <span class="auth-field-uni">University Name</span>
            <InputText v-model="form.name" placeholder="Nguyễn Văn A" autocomplete="name" autoFocus />
            <span class="auth-field-desc">Họ tên đầy đủ sẽ hiển thị trên chứng chỉ và hồ sơ học tập.</span>
          </label>

          <label>
            <span>Email</span>
            <span class="auth-field-uni">University Name</span>
            <InputText v-model="form.email" type="email" placeholder="email@example.com" autocomplete="email" />
            <span class="auth-field-desc">Email dùng để đăng nhập, khôi phục mật khẩu và nhận thông báo.</span>
          </label>

          <label>
            <span>Mật khẩu</span>
            <span class="auth-field-uni">University Name</span>
            <Password v-model="form.password" placeholder="••••••••" :feedback="false" toggle-mask autocomplete="new-password" />
            <span class="auth-field-desc">Tối thiểu 6 ký tự. Mật khẩu bảo vệ tài khoản học tập của bạn.</span>
          </label>

          <label>
            <span>Xác nhận mật khẩu</span>
            <span class="auth-field-uni">University Name</span>
            <Password v-model="form.password_confirmation" placeholder="••••••••" :feedback="false" toggle-mask autocomplete="new-password" />
            <span class="auth-field-desc">Nhập lại mật khẩu để xác nhận.</span>
          </label>

          <label class="notice agree">
            <input v-model="agreed" type="checkbox">
            <span>Tôi đồng ý với các điều khoản sử dụng của ERIPT LMS.</span>
          </label>

          <Button type="submit" label="Tạo tài khoản" icon="pi pi-user-plus" :loading="loading" />
        </form>

        <div class="google-auth">
          <div class="auth-divider"><span>hoặc</span></div>
          <AuthGoogleButton label="Đăng ký / Đăng nhập bằng Google" @error="error = $event" />
        </div>

        <p class="auth-foot">Đã có tài khoản? <NuxtLink to="/login">Đăng nhập</NuxtLink></p>

        <div class="auth-brand-footer">
          <span>ERIPT LMS</span> · University Name &amp; Logo
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.agree {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  cursor: pointer;
}

.agree input {
  flex: 0 0 auto;
  width: 16px;
  height: 16px;
  margin-top: 3px;
  accent-color: var(--brand);
  cursor: pointer;
}

.agree span {
  color: color-mix(in srgb, #fff 80%, transparent);
  font-size: .86rem;
  font-weight: 400;
  line-height: 1.5;
}
</style>
