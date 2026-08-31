<script setup>
import { useI18n } from 'vue-i18n'

const { locale } = useI18n({
  useScope: 'global'
})

function switchLanguage() {
  if (locale.value === 'en') {
    locale.value = 'zh-TW'
  } else {
    locale.value = 'en'
  }
}
</script>

<template>
  <button
    class="language-button"
    @click="switchLanguage"
  >
    {{ locale === 'en' ? '中文' : 'English' }}
  </button>
</template>

<style scoped>
.language-button {
  padding: 8px 14px;
  cursor: pointer;
}
</style>