<script setup>
import LanguageSwitcher from '@/components/LanguageSwitcher.vue'
</script>

<template>
  <div class="app-container">
    <header class="app-header">
      <h1>
        {{ $t('app.title') }}
      </h1>

      <LanguageSwitcher />
    </header>

    <main class="app-main">
      <RouterView />
    </main>
  </div>
</template>

<style scoped>
.app-container {
  width: 100%;
  height: 100vh;
}

.app-header {
  height: 70px;

  display: flex;

  align-items: center;

  justify-content: space-between;

  padding: 0 20px;
}

.app-header h1 {
  margin: 0;
}

.app-main {
  width: 100%;

  height: calc(100vh - 70px);
}
</style>
