<script setup>
import { ref } from 'vue'

import '@/assets/styles/layer-control.css'

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

const isOpen = ref(true)

function toggleDropdown() {
  isOpen.value = !isOpen.value
}

function handleLayerToggle(layerId) {
  emit('toggle-layer', layerId)
}
</script>

<template>
  <div class="layer-control">
    <!-- Open or close the layer menu -->
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

    <!-- Show the layer options while the menu is open -->
    <div v-if="isOpen" class="layer-dropdown">
      <!-- Hotspot risk layer -->
      <label class="layer-option">
        <input
          class="layer-checkbox"
          type="checkbox"
          :checked="visibleLayers['hotspot-risk']"
          @change="handleLayerToggle('hotspot-risk')"
        />

        <span class="layer-color" style="background-color: #b85c4b"></span>

        <span class="layer-name">
          {{ $t('layers.hotspotRisk') }}
        </span>

        <span v-if="loadingLayers['hotspot-risk']" class="loading-container">
          <span class="loading-spinner"></span>

          <span class="loading-text">
            {{ $t('layers.loading') }}
          </span>
        </span>
      </label>

      <!-- Hotspot risk color legend -->
      <div class="risk-legend">
        <div class="risk-legend-item">
          <span class="risk-legend-color" style="background-color: #8b3a3a"></span>

          <span class="risk-legend-label">
            {{ $t('risk.veryHigh') }}
          </span>
        </div>

        <div class="risk-legend-item">
          <span class="risk-legend-color" style="background-color: #b85c4b"></span>

          <span class="risk-legend-label">
            {{ $t('risk.high') }}
          </span>
        </div>

        <div class="risk-legend-item">
          <span class="risk-legend-color" style="background-color: #d89a5b"></span>

          <span class="risk-legend-label">
            {{ $t('risk.moderate') }}
          </span>
        </div>

        <div class="risk-legend-item">
          <span class="risk-legend-color" style="background-color: #d8c77b"></span>

          <span class="risk-legend-label">
            {{ $t('risk.low') }}
          </span>
        </div>

        <div class="risk-legend-item">
          <span class="risk-legend-color" style="background-color: #a8b88a"></span>

          <span class="risk-legend-label">
            {{ $t('risk.veryLow') }}
          </span>
        </div>
      </div>

      <!-- Other map layers -->
      <template v-for="layer in MAP_LAYERS" :key="layer.id">
        <label v-if="layer.id !== 'hotspot-risk'" class="layer-option">
          <input
            class="layer-checkbox"
            type="checkbox"
            :checked="visibleLayers[layer.id]"
            @change="handleLayerToggle(layer.id)"
          />

          <span
            class="layer-color"
            :class="{
              'point-symbol': layer.type === 'point',
            }"
            :style="{
              backgroundColor: layer.color,
            }"
          ></span>

          <span class="layer-name">
            {{ $t(layer.translationKey) }}
          </span>

          <span v-if="loadingLayers[layer.id]" class="loading-container">
            <span class="loading-spinner"></span>

            <span class="loading-text">
              {{ $t('layers.loading') }}
            </span>
          </span>
        </label>
      </template>
    </div>
  </div>
</template>
