<script setup lang="ts">
import { dashboardFor } from '~/types/auth'

definePageMeta({ layout: 'auth' })

const auth = useAuthStore()
const route = useRoute()
const { t, locale } = useI18n()
const loading = ref(false)
const error = ref(route.query.expired ? t('auth.login.errors.expired') : '')
const remember = ref(true)
const showPassword = ref(false)
const form = reactive({ email: '', password: '' })

function dashboardPath(user: { roles?: string[], role?: string | null }) {
  const roles = user?.roles || (user?.role ? [user.role] : [])
  if (roles.includes('admin')) return '/admin'
  if (roles.includes('instructor')) return '/instructor'
  return '/student'
}

function postLoginTarget(user: { roles?: string[], role?: string | null }) {
  const redirect = route.query.redirect
  if (typeof redirect === 'string' && redirect.startsWith('/') && !redirect.startsWith('//')) {
    return redirect
  }
  return dashboardFor(user)
}

function friendlyLoginError(err: any): string {
  const status = Number(err?.statusCode || err?.status || err?.response?.status || 0)
  const raw = String(err?.data?.message || err?.message || '')
  const looksTechnical = /POST\s+\/api|GET\s+\/api|\/api\/|status code|Failed to fetch|NetworkError|ECONNREFUSED|\b502\b|\b503\b|\b500\b|\b504\b|FetchError|ofetch/i.test(raw)

  if (status === 401 || status === 422) {
    return t('auth.login.errors.invalid')
  }
  if (status === 429) {
    return t('auth.login.errors.tooMany')
  }
  if (status >= 500 || status === 0 || looksTechnical || !raw) {
    return t('auth.login.errors.generic')
  }
  if (raw.length > 140) {
    return t('auth.login.errors.generic')
  }
  return raw
}

async function loginViaFetch(email: string, password: string) {
  const res = await fetch('/api/auth/login', {
    method: 'POST',
    headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) {
    const err: any = new Error(data?.message || t('auth.login.errors.failed'))
    err.statusCode = res.status
    err.data = data
    throw err
  }
  const maxAge = 60 * 60 * 24 * 7
  document.cookie = `eript-token=${encodeURIComponent(data.access_token)}; Path=/; Max-Age=${maxAge}; SameSite=Lax`
  document.cookie = `eript-user=${encodeURIComponent(JSON.stringify(data.user))}; Path=/; Max-Age=${maxAge}; SameSite=Lax`
  return data
}

async function submit(event?: Event) {
  event?.preventDefault()
  error.value = ''

  const formEl = document.getElementById('eript-login-form') as HTMLFormElement | null
  const email
    = form.email
      || (formEl?.querySelector<HTMLInputElement>('input[name="email"]')?.value ?? '')
  const password
    = form.password
      || (formEl?.querySelector<HTMLInputElement>('input[name="password"]')?.value ?? '')

  if (!email || !password) {
    error.value = t('auth.login.errors.required')
    return
  }

  loading.value = true
  try {
    if (auth && typeof auth.login === 'function' && auth.ready !== false) {
      try {
        const response = await auth.login({ email, password })
        await navigateTo(postLoginTarget(response.user))
        return
      }
      catch (piniaErr: any) {
        if (piniaErr?.statusCode && piniaErr.statusCode !== 401 && piniaErr.statusCode !== 422) {
          throw piniaErr
        }
        if (piniaErr?.statusCode === 401 || piniaErr?.statusCode === 422 || piniaErr?.statusCode === 403) {
          throw piniaErr
        }
      }
    }

    const data = await loginViaFetch(email, password)
    const redirect = route.query.redirect
    const target = typeof redirect === 'string' && redirect.startsWith('/') && !redirect.startsWith('//')
      ? redirect
      : dashboardPath(data.user)
    window.location.assign(target)
  }
  catch (requestError: any) {
    if (requestError?.statusCode === 403 && requestError?.data?.requires_verification) {
      window.location.assign(`/verify-email?email=${encodeURIComponent(email)}`)
      return
    }
    error.value = friendlyLoginError(requestError)
  }
  finally {
    loading.value = false
  }
}

function onGoogleError(msg: string) {
  error.value = friendlyLoginError({ message: msg })
}

onMounted(() => {
  const formEl = document.getElementById('eript-login-form')
  if (!formEl || (formEl as any)._eriptBound) return
  ;(formEl as any)._eriptBound = true
  formEl.addEventListener('submit', (e) => {
    e.preventDefault()
    void submit(e)
  })
})

const bootMessages = computed(() => ({
  required: t('auth.login.errors.required'),
  invalid: t('auth.login.errors.invalid'),
  generic: t('auth.login.errors.generic'),
}))

useHead(() => ({
  script: [
    {
      key: 'eript-login-boot',
      children: `
(function () {
  var MSG = ${JSON.stringify(bootMessages.value)};
  window.__eriptLoginMsg = MSG;
  if (window.__eriptLoginBoot) return;
  window.__eriptLoginBoot = true;
  function msgs() { return window.__eriptLoginMsg || MSG; }
  function friendly(msg, status) {
    var s = String(msg || '');
    var st = Number(status || 0);
    var m = msgs();
    if (st === 401 || st === 422) return m.invalid;
    if (/POST\\s+\\/api|\\/api\\/|status code|Failed to fetch|NetworkError|\\b502\\b|\\b503\\b|\\b500\\b|FetchError/i.test(s) || st >= 500 || !s) {
      return m.generic;
    }
    if (s.length > 140) return m.generic;
    return s;
  }
  function boot() {
    var form = document.getElementById('eript-login-form');
    if (!form || form._eriptBound) return;
    form._eriptBound = true;
    var btn = form.querySelector('[data-login-btn]');
    var errEl = document.getElementById('eript-login-error');
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      e.stopPropagation();
      var email = (form.querySelector('input[name="email"]') || {}).value || '';
      var password = (form.querySelector('input[name="password"]') || {}).value || '';
      if (!email || !password) {
        if (errEl) { errEl.hidden = false; errEl.textContent = msgs().required; }
        return;
      }
      if (btn) { btn.disabled = true; btn.setAttribute('aria-busy', 'true'); }
      if (errEl) { errEl.hidden = true; errEl.textContent = ''; }
      fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Accept': 'application/json', 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email, password: password })
      }).then(function (res) {
        return res.json().then(function (data) { return { res: res, data: data }; }).catch(function () {
          return { res: res, data: {} };
        });
      }).then(function (r) {
        if (!r.res.ok) {
          if (r.res.status === 403 && r.data && r.data.requires_verification) {
            location.assign('/verify-email?email=' + encodeURIComponent(email));
            return;
          }
          throw { status: r.res.status, message: (r.data && r.data.message) || '' };
        }
        var maxAge = 60 * 60 * 24 * 7;
        document.cookie = 'eript-token=' + encodeURIComponent(r.data.access_token) + '; Path=/; Max-Age=' + maxAge + '; SameSite=Lax';
        document.cookie = 'eript-user=' + encodeURIComponent(JSON.stringify(r.data.user)) + '; Path=/; Max-Age=' + maxAge + '; SameSite=Lax';
        var roles = (r.data.user && r.data.user.roles) || [];
        var dest = '/student';
        if (roles.indexOf('admin') !== -1) dest = '/admin';
        else if (roles.indexOf('instructor') !== -1) dest = '/instructor';
        location.assign(dest);
      }).catch(function (err) {
        if (errEl) { errEl.hidden = false; errEl.textContent = friendly(err && err.message, err && err.status); }
        if (btn) { btn.disabled = false; btn.removeAttribute('aria-busy'); }
      });
    });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
      `,
    },
  ],
}))

watch(locale, () => {
  if (import.meta.client) {
    ;(window as any).__eriptLoginMsg = bootMessages.value
  }
})
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
          <span>Đăng nhập</span>
          <h2>Chào mừng trở lại</h2>
          <p>Nhập thông tin tài khoản để tiếp tục vào hệ thống học tập.</p>
        </div>

        <div v-if="error" class="notice">{{ error }}</div>
        <div id="eript-login-error" class="boot-error" hidden />

        <form id="eript-login-form" class="auth-form" method="post" action="#" onsubmit="return false;" @submit.prevent="submit">
          <label>
            <span>Tên đăng nhập / Email</span>
            <span class="auth-field-uni">University Name</span>
            <input
              v-model="form.email"
              class="native-input"
              name="email"
              type="email"
              placeholder="email@example.com"
              autocomplete="username"
              autoFocus
              required
            >
            <span class="auth-field-desc">Mã sinh viên / mã giảng viên hoặc địa chỉ email đã đăng ký.</span>
          </label>

          <label>
            <span>Mật khẩu</span>
            <span class="auth-field-uni">University Name</span>
            <div class="password-wrap">
              <input
                v-model="form.password"
                class="native-input"
                name="password"
                :type="showPassword ? 'text' : 'password'"
                placeholder="••••••••"
                autocomplete="current-password"
                required
              >
              <button
                type="button"
                class="toggle-password"
                :aria-label="showPassword ? t('auth.login.hidePassword') : t('auth.login.showPassword')"
                @click="showPassword = !showPassword"
              >
                <i :class="showPassword ? 'pi pi-eye-slash' : 'pi pi-eye'" />
              </button>
            </div>
            <span class="auth-field-desc">Mật khẩu được cấp bởi phòng đào tạo hoặc do bạn tự đặt lại.</span>
          </label>

          <div class="remember-forgot">
            <label class="remember">
              <input v-model="remember" type="checkbox">
              <span>Ghi nhớ đăng nhập</span>
            </label>
            <a href="/forgot-password" class="forgot-link">Quên mật khẩu?</a>
          </div>

          <button
            data-login-btn
            type="submit"
            class="native-submit"
            :disabled="loading"
            :aria-busy="loading ? 'true' : 'false'"
          >
            <span v-if="loading" class="spin" aria-hidden="true" />
            {{ t('auth.login.submit') }}
          </button>
        </form>

        <div class="google-auth">
          <div class="auth-divider"><span>hoặc</span></div>
          <AuthGoogleButton :label="t('auth.login.google')" @error="onGoogleError" />
        </div>

        <p class="auth-foot">{{ t('auth.login.noAccount') }} <a href="/register">{{ t('auth.login.register') }}</a></p>

        <div class="auth-brand-footer">
          <span>ERIPT LMS</span> · University Name &amp; Logo
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.boot-error {
  margin-bottom: 12px;
  padding: 10px 14px;
  border-radius: 10px;
  background: color-mix(in srgb, rgba(220, 38, 38, 0.15), transparent);
  color: #fca5a5;
  font-size: .85rem;
  border: 1px solid color-mix(in srgb, rgba(220, 38, 38, 0.3), transparent);
}

.boot-error[hidden] { display: none !important; }

.spin {
  width: 16px;
  height: 16px;
  border: 2px solid rgba(255, 255, 255, 0.35);
  border-top-color: #fff;
  border-radius: 50%;
  animation: spin .7s linear infinite;
  display: inline-block;
  margin-right: 8px;
}

@keyframes spin { to { transform: rotate(360deg); } }

.forgot-link {
  color: color-mix(in srgb, var(--brand, #0f766e) 90%, #fff);
  font-weight: 700;
  font-size: .88rem;
  text-decoration: underline;
  text-underline-offset: 2px;
}

.forgot-link:hover {
  color: #fff;
  opacity: .9;
}
</style>
