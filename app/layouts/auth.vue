<script setup lang="ts">
const { settings, load: loadSiteSettings } = useSiteSettings()
const authImage = computed(() => settings.value.auth_page_image || '/images/auth-campus.png?v=3')

onMounted(() => {
  document.documentElement.classList.add('auth-lock-scroll')
  loadSiteSettings()
})
onBeforeUnmount(() => {
  document.documentElement.classList.remove('auth-lock-scroll')
})
</script>

<template>
  <div class="auth-shell">
    <div class="auth-bg" aria-hidden="true" :style="{ backgroundImage: `linear-gradient(105deg, rgba(8, 18, 28, .72) 0%, rgba(8, 18, 28, .52) 50%, rgba(8, 18, 28, .38) 100%), url('${authImage}')` }" />
    <main class="auth-content">
      <slot />
    </main>
  </div>
</template>

<style scoped>
.auth-shell {
  position: relative;
  height: 100dvh;
  min-height: 100dvh;
  overflow: hidden;
}

.auth-bg {
  position: absolute;
  inset: 0;
  background-color: #0b1c24;
  background-position: center;
  background-size: cover;
  background-repeat: no-repeat;
}

.auth-content {
  position: relative;
  z-index: 1;
  height: 100dvh;
  min-height: 100dvh;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  padding: 24px;
  box-sizing: border-box;
}

@media (max-width: 900px) {
  .auth-shell,
  .auth-content {
    height: auto;
    min-height: 100dvh;
    overflow: visible;
    padding: 16px;
  }
}
</style>

<style>
html.auth-lock-scroll,
html.auth-lock-scroll body {
  height: 100%;
  overflow: hidden;
}

@media (max-width: 900px) {
  html.auth-lock-scroll,
  html.auth-lock-scroll body {
    height: auto;
    overflow: auto;
  }
}
</style>
