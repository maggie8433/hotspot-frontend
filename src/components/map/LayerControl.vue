<script setup>
import { ref } from 'vue'
import { MAP_LAYERS } from '@/config/mapLayers'

defineProps({
  visibleLayers: {
    type: Object,
    required: true,
  },

  loadingLayers: {
    type: Object,
    required: true,
  },
})

const emit = defineEmits(['toggle-layer'])

const isOpen = ref(false)

function toggleDropdown() {
  isOpen.value = !isOpen.value
}

function handleLayerToggle(layerId) {
  emit('toggle-layer', layerId)
}
</script>

<template>
  <div class="layer-control">
    <button class="layer-control-button" type="button" @click="toggleDropdown">
      <span class="layer-control-title">
        {{ $t('layers.title') }}
      </span>

      <span
        class="arrow"
        :class="{
          open: isOpen,
        }"
      >
        ▼
      </span>
    </button>

    <div v-if="isOpen" class="layer-dropdown">
      <label v-for="layer in MAP_LAYERS" :key="layer.id" class="layer-option">
        <input
          class="layer-checkbox"
          type="checkbox"
          :checked="visibleLayers[layer.id]"
          @change="handleLayerToggle(layer.id)"
        />

        <!-- Use a circular legend symbol for the wildlife point layer. -->
        <span
          class="layer-color"
          :class="{
            'point-symbol': layer.id === 'forest-wildlife-distribution',
          }"
          :style="{
            backgroundColor: layer.color,
          }"
        ></span>

        <span class="layer-name">
          {{ $t(layer.translationKey) }}
        </span>

        <!-- Keep feedback visible while a layer is waiting for its API response. -->
        <span v-if="loadingLayers[layer.id]" class="loading-container">
          <span class="loading-spinner"></span>

          <span class="loading-text">
            {{ $t('layers.loading') }}
          </span>
        </span>
      </label>
    </div>
  </div>
</template>

<style scoped>
.layer-control {
  position: absolute;

  /* Leave space for Leaflet's zoom controls on the left. */
  top: 20px;
  left: 80px;
  right: auto;

  z-index: 1000;

  width: 360px;
  max-width: calc(100% - 120px);
}

.layer-control-button {
  width: 100%;

  display: flex;
  align-items: center;
  justify-content: space-between;

  padding: 14px 18px;

  background: rgba(255, 255, 255, 0.96);

  border: 1px solid rgba(0, 0, 0, 0.08);

  border-radius: 10px;

  box-shadow: 0 3px 12px rgba(0, 0, 0, 0.16);

  cursor: pointer;
}

.layer-control-button:hover {
  background: #ffffff;
}

.layer-control-title {
  font-size: 20px;
  font-weight: 700;
  color: #26382d;
}

.arrow {
  font-size: 14px;
  color: #26382d;

  transition: transform 0.2s ease;
}

.arrow.open {
  transform: rotate(180deg);
}

.layer-dropdown {
  margin-top: 8px;
  padding: 12px;

  background: rgba(255, 255, 255, 0.97);

  border: 1px solid rgba(0, 0, 0, 0.08);

  border-radius: 10px;

  box-shadow: 0 3px 12px rgba(0, 0, 0, 0.16);

  max-height: 65vh;
  overflow-y: auto;
}

.layer-option {
  display: flex;
  align-items: center;

  gap: 10px;

  min-height: 42px;
  padding: 6px 8px;

  border-radius: 7px;

  cursor: pointer;

  transition: background 0.15s ease;
}

.layer-option:hover {
  background: #f2f6f2;
}

.layer-checkbox {
  width: 19px;
  height: 19px;

  margin: 0;

  flex-shrink: 0;

  cursor: pointer;

  accent-color: #3f704d;
}

.layer-color {
  width: 16px;
  height: 16px;

  flex-shrink: 0;

  border-radius: 3px;

  border: 1.5px solid rgba(0, 0, 0, 0.35);

  box-sizing: border-box;
}

/* Forest Wildlife Distribution is point data, so its symbol is circular. */
.layer-color.point-symbol {
  width: 15px;
  height: 15px;

  margin-left: 0.5px;
  margin-right: 0.5px;

  border-radius: 50%;
}

.layer-name {
  flex: 1;

  font-size: 16px;
  line-height: 1.3;

  color: #252525;
}

.loading-container {
  display: flex;
  align-items: center;

  gap: 6px;

  flex-shrink: 0;
}

.loading-spinner {
  width: 14px;
  height: 14px;

  box-sizing: border-box;

  border: 2px solid #d5ddd7;

  border-top-color: #3f704d;

  border-radius: 50%;

  animation: layer-spin 0.8s linear infinite;
}

.loading-text {
  font-size: 12px;
  font-weight: 500;

  color: #52675a;

  white-space: nowrap;
}

@keyframes layer-spin {
  from {
    transform: rotate(0deg);
  }

  to {
    transform: rotate(360deg);
  }
}

.layer-dropdown::-webkit-scrollbar {
  width: 7px;
}

.layer-dropdown::-webkit-scrollbar-track {
  background: transparent;
}

.layer-dropdown::-webkit-scrollbar-thumb {
  background: #bcc8bf;
  border-radius: 10px;
}

@media (max-width: 900px) {
  .layer-control {
    top: 15px;
    left: 70px;

    width: 320px;
    max-width: calc(100% - 90px);
  }

  .layer-control-title {
    font-size: 18px;
  }

  .layer-name {
    font-size: 15px;
  }
}

@media (max-width: 700px) {
  .layer-control {
    top: 15px;
    left: 65px;

    width: 290px;
    max-width: calc(100% - 80px);
  }

  .layer-control-button {
    padding: 11px 14px;
  }

  .layer-control-title {
    font-size: 17px;
  }

  .layer-dropdown {
    padding: 9px;
    max-height: 55vh;
  }

  .layer-name {
    font-size: 14px;
  }

  .layer-option {
    min-height: 38px;

    gap: 8px;
    padding: 5px;
  }

  .layer-checkbox {
    width: 17px;
    height: 17px;
  }

  .layer-color {
    width: 14px;
    height: 14px;
  }

  /* The spinner is enough feedback on smaller screens where space is limited. */
  .loading-text {
    display: none;
  }
}
</style>
