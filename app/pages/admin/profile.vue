<script setup lang="ts">
definePageMeta({
  layout: 'admin',
  middleware: ['auth', 'admin'],
})

const { t } = useI18n()
useHead({ title: () => t('admin.profile.title') })
</script>

<template>
  <div class="page">
    <CommonAccountProfileForm />
  </div>
</template>
