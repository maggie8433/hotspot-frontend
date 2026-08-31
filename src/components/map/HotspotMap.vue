<script setup>
import { onMounted, onBeforeUnmount, reactive, ref, watch } from 'vue'

import { useI18n } from 'vue-i18n'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'

import { getHotspotGeo } from '@/api/hotspotApi'
import { getEcologicalLayer } from '@/api/ecologicalLayerApi'
import LayerControl from '@/components/map/LayerControl.vue'

const mapContainer = ref(null)

const { locale, t } = useI18n({
  useScope: 'global',
})

let map = null
let hotspotLayer = null
let taiwanBoundaryLayer = null
let cityLabelLayer = null
let hotspotGeoJson = null

// Cache loaded layers so switching them back on does not require another API request.
const leafletLayers = {}

// Keep track of active requests so they can be cancelled if a layer is unchecked.
const ecologicalRequestControllers = {}

const visibleLayers = reactive({
  'hotspot-risk': true,
  'important-wildlife-habitats': false,
  'natural-reserve-areas': false,
  'nature-reserves': false,
  'terrestrial-wildlife-protected-areas': false,
  'ecological-conservation-corridors': false,
  'state-forest-management-areas': false,
  'forest-wildlife-distribution': false,
})

// Used by LayerControl to show which layers are waiting for data.
const loadingLayers = reactive({
  'hotspot-risk': false,
  'important-wildlife-habitats': false,
  'natural-reserve-areas': false,
  'nature-reserves': false,
  'terrestrial-wildlife-protected-areas': false,
  'ecological-conservation-corridors': false,
  'state-forest-management-areas': false,
  'forest-wildlife-distribution': false,
})

const INITIAL_TAIWAN_BOUNDS = L.latLngBounds([21.7, 119.2], [25.5, 122.1])

function isChinese() {
  return String(locale.value).toLowerCase().startsWith('zh')
}

function formatScore(value) {
  if (value === null || value === undefined || value === '') {
    return '-'
  }

  const number = Number(value)

  if (Number.isNaN(number)) {
    return '-'
  }

  return number.toFixed(2)
}

function taiwanBoundaryStyle() {
  return {
    color: '#555555',
    weight: 1.5,
    opacity: 1,
    fillColor: 'transparent',
    fillOpacity: 0,
  }
}

function getRiskColor(riskLevel) {
  switch (riskLevel) {
    case 'Very High':
      return '#8B3A3A'

    case 'High':
      return '#B85C4B'

    case 'Moderate':
      return '#D89A5B'

    case 'Low':
      return '#D8C77B'

    case 'Very Low':
      return '#A8B88A'

    default:
      return '#CCCCCC'
  }
}

function getRiskTranslation(riskLevel) {
  switch (riskLevel) {
    case 'Very High':
      return t('risk.veryHigh')

    case 'High':
      return t('risk.high')

    case 'Moderate':
      return t('risk.moderate')

    case 'Low':
      return t('risk.low')

    case 'Very Low':
      return t('risk.veryLow')

    default:
      return riskLevel || '-'
  }
}

function hotspotStyle(feature) {
  return {
    fillColor: getRiskColor(feature.properties.riskLevel),
    weight: 1,
    opacity: 1,
    color: '#555555',
    fillOpacity: 0.4,
  }
}

// Each ecological dataset uses a different colour so overlapping layers remain distinguishable.
function getEcologicalStyle(layerName) {
  switch (layerName) {
    case 'important-wildlife-habitats':
      return {
        color: '#1B5E20',
        weight: 2.5,
        fillColor: '#4CAF50',
        fillOpacity: 0.28,
      }

    case 'natural-reserve-areas':
      return {
        color: '#00695C',
        weight: 2.5,
        fillColor: '#26A69A',
        fillOpacity: 0.26,
      }

    case 'nature-reserves':
      return {
        color: '#827717',
        weight: 2.5,
        fillColor: '#C0CA33',
        fillOpacity: 0.28,
      }

    case 'terrestrial-wildlife-protected-areas':
      return {
        color: '#6D4C41',
        weight: 2.5,
        fillColor: '#A1887F',
        fillOpacity: 0.28,
      }

    case 'ecological-conservation-corridors':
      return {
        color: '#1565C0',
        weight: 2.5,
        fillColor: '#42A5F5',
        fillOpacity: 0.22,
      }

    case 'state-forest-management-areas':
      return {
        color: '#EF6C00',
        weight: 2.5,
        fillColor: '#FFB74D',
        fillOpacity: 0.23,
      }

    default:
      return {
        color: '#455A64',
        weight: 2.5,
        fillColor: '#90A4AE',
        fillOpacity: 0.25,
      }
  }
}

function getCityName(properties) {
  if (!properties) {
    return '-'
  }

  if (isChinese()) {
    return properties.cityNameZh || properties.cityNameEn || '-'
  }

  return properties.cityNameEn || properties.cityNameZh || '-'
}

function getDisplayName(properties) {
  if (!properties) {
    return '-'
  }

  if (isChinese()) {
    return properties.nameZh || properties.nameEn || '-'
  }

  return properties.nameEn || properties.nameZh || '-'
}

// State forest data uses different property names from the other ecological layers.
function getForestDistrictName(properties) {
  if (!properties) {
    return '-'
  }

  if (isChinese()) {
    return properties.forestDistrictName || properties.forestDistrictNameEn || '-'
  }

  return properties.forestDistrictNameEn || properties.forestDistrictName || '-'
}

function createCityLabels(geoJson) {
  if (!map || !geoJson) {
    return
  }

  // Recreate the labels when the language changes.
  if (cityLabelLayer && map.hasLayer(cityLabelLayer)) {
    map.removeLayer(cityLabelLayer)
  }

  cityLabelLayer = L.layerGroup()

  L.geoJSON(geoJson, {
    onEachFeature(feature, featureLayer) {
      const properties = feature.properties || {}

      const cityName = getCityName(properties)

      if (!cityName || cityName === '-') {
        return
      }

      let center

      // Prefer the label position calculated by the backend for irregular MultiPolygons.
      if (properties.labelLat != null && properties.labelLng != null) {
        center = L.latLng(Number(properties.labelLat), Number(properties.labelLng))
      } else {
        center = featureLayer.getBounds().getCenter()
      }

      const label = L.marker(center, {
        pane: 'cityLabels',
        interactive: false,
        keyboard: false,

        icon: L.divIcon({
          className: 'city-label-container',

          html: `
                <div class="city-label">
                  ${cityName}
                </div>
              `,

          iconSize: null,
        }),
      })

      cityLabelLayer.addLayer(label)
    },
  })

  cityLabelLayer.addTo(map)
}

function bindHotspotPopup(feature, layer) {
  const properties = feature.properties || {}

  // Build the popup on click so it always uses the currently selected language.
  layer.on('click', () => {
    const cityName = getCityName(properties)

    const popupContent = `
        <div class="hotspot-popup">

          <h3>
            ${cityName}
          </h3>

          <p>
            <strong>
              ${t('risk.title')}:
            </strong>

            ${getRiskTranslation(properties.riskLevel)}
          </p>

          <p>
            <strong>
              ${t('hotspot.score')}:
            </strong>

            ${formatScore(properties.hotspotScore)}
          </p>

          <p>
            <strong>
              ${t('hotspot.rank')}:
            </strong>

            ${properties.riskRank ?? '-'}
          </p>

          <hr>

          <p>
            <strong>
              ${t('hotspot.strayScore')}:
            </strong>

            ${formatScore(properties.strayScore)}
          </p>

          <p>
            <strong>
              ${t('hotspot.ecologicalScore')}:
            </strong>

            ${formatScore(properties.ecologicalScore)}
          </p>

          <p>
            <strong>
              ${t('hotspot.shelterScore')}:
            </strong>

            ${formatScore(properties.shelterScore)}
          </p>

        </div>
      `

    layer.bindPopup(popupContent).openPopup()
  })
}

function bindEcologicalPopup(feature, layer, layerName) {
  const properties = feature.properties || {}

  // Popup content is generated on click to respect the current language.
  layer.on('click', () => {
    let popupContent

    if (layerName === 'state-forest-management-areas') {
      const forestDistrictName = getForestDistrictName(properties)

      popupContent = `
          <div class="ecological-popup">

            <p>
              <strong>
                ${t('ecological.forestDistrictName')}:
              </strong>

              ${forestDistrictName}
            </p>

          </div>
        `
    } else {
      const displayName = getDisplayName(properties)

      popupContent = `
          <div class="ecological-popup">

            <p>
              <strong>
                ${t('ecological.name')}:
              </strong>

              ${displayName}
            </p>

          </div>
        `
    }

    layer.bindPopup(popupContent).openPopup()
  })
}

async function loadHotspotLayer() {
  try {
    const geoJson = await getHotspotGeo()

    hotspotGeoJson = geoJson

    if (!geoJson.features || geoJson.features.length === 0) {
      throw new Error('Hotspot API returned no Taiwan features.')
    }

    // The county boundary stays visible even when the hotspot layer is turned off.
    taiwanBoundaryLayer = L.geoJSON(geoJson, {
      pane: 'boundaries',
      style: taiwanBoundaryStyle,
      interactive: false,
    })

    taiwanBoundaryLayer.addTo(map)

    hotspotLayer = L.geoJSON(geoJson, {
      pane: 'hotspot',
      style: hotspotStyle,

      onEachFeature(feature, featureLayer) {
        bindHotspotPopup(feature, featureLayer)
      },
    })

    leafletLayers['hotspot-risk'] = hotspotLayer

    if (visibleLayers['hotspot-risk']) {
      hotspotLayer.addTo(map)
    }

    createCityLabels(geoJson)

    const taiwanBounds = taiwanBoundaryLayer.getBounds()

    if (taiwanBounds.isValid()) {
      map.fitBounds(taiwanBounds, {
        padding: [25, 25],
        maxZoom: 8,
      })

      // Keep navigation close to Taiwan rather than allowing the map to drift worldwide.
      map.setMaxBounds(taiwanBounds.pad(0.08))
    }
  } catch (error) {
    console.error('Unable to load hotspot layer:', error)
  }
}

function createEcologicalLeafletLayer(geoJson, layerName) {
  // Wildlife distribution is displayed as points only and intentionally has no popup.
  if (layerName === 'forest-wildlife-distribution') {
    return L.geoJSON(geoJson, {
      pane: 'ecological',

      pointToLayer(feature, latlng) {
        return L.circleMarker(latlng, {
          pane: 'ecological',
          radius: 6,
          color: '#7B1FA2',
          weight: 1.5,
          fillColor: '#E040FB',
          fillOpacity: 0.95,
        })
      },
    })
  }

  return L.geoJSON(geoJson, {
    pane: 'ecological',

    style: getEcologicalStyle(layerName),

    onEachFeature(feature, featureLayer) {
      bindEcologicalPopup(feature, featureLayer, layerName)
    },
  })
}

async function loadEcologicalLayer(layerName, signal) {
  // Return an existing layer immediately if it has already been loaded.
  if (leafletLayers[layerName]) {
    return leafletLayers[layerName]
  }

  console.log('Loading ecological layer:', layerName)

  const geoJson = await getEcologicalLayer(layerName, signal)

  // Avoid creating or caching a layer after its request has been cancelled.
  if (signal.aborted) {
    return null
  }

  if (!geoJson || !geoJson.features || geoJson.features.length === 0) {
    throw new Error(`No features returned for ${layerName}`)
  }

  console.log(`${layerName} feature count:`, geoJson.features.length)

  const layer = createEcologicalLeafletLayer(geoJson, layerName)

  if (signal.aborted) {
    return null
  }

  leafletLayers[layerName] = layer

  return layer
}

async function toggleLayer(layerName) {
  const shouldShow = !visibleLayers[layerName]

  visibleLayers[layerName] = shouldShow

  if (layerName === 'hotspot-risk') {
    if (shouldShow && hotspotLayer) {
      hotspotLayer.addTo(map)
    } else if (hotspotLayer && map.hasLayer(hotspotLayer)) {
      map.removeLayer(hotspotLayer)
    }

    return
  }

  if (!shouldShow) {
    const controller = ecologicalRequestControllers[layerName]

    // Cancel slow requests if the user switches the layer off before loading finishes.
    if (controller) {
      controller.abort()

      delete ecologicalRequestControllers[layerName]
    }

    loadingLayers[layerName] = false

    const layer = leafletLayers[layerName]

    if (layer && map.hasLayer(layer)) {
      map.removeLayer(layer)
    }

    return
  }

  // Cached layers can be shown again without requesting the data from the backend.
  if (leafletLayers[layerName]) {
    leafletLayers[layerName].addTo(map)

    return
  }

  try {
    loadingLayers[layerName] = true

    const oldController = ecologicalRequestControllers[layerName]

    if (oldController) {
      oldController.abort()
    }

    const controller = new AbortController()

    ecologicalRequestControllers[layerName] = controller

    const layer = await loadEcologicalLayer(layerName, controller.signal)

    if (controller.signal.aborted) {
      return
    }

    // The user may have unchecked the layer while its request was still running.
    if (!visibleLayers[layerName]) {
      return
    }

    if (layer) {
      layer.addTo(map)
    }

    delete ecologicalRequestControllers[layerName]
  } catch (error) {
    // AbortError is expected when a user quickly switches a loading layer off.
    if (error.name === 'AbortError') {
      console.log('Ecological request cancelled:', layerName)

      return
    }

    visibleLayers[layerName] = false

    console.error(`Unable to load ${layerName}:`, error)
  } finally {
    loadingLayers[layerName] = false
  }
}

// Labels are rebuilt after a language change; existing popups are closed to avoid stale text.
watch(locale, () => {
  if (map && hotspotGeoJson) {
    createCityLabels(hotspotGeoJson)
  }

  if (map) {
    map.closePopup()
  }
})

onMounted(async () => {
  map = L.map(mapContainer.value, {
    maxBounds: INITIAL_TAIWAN_BOUNDS,

    maxBoundsViscosity: 1.0,
    minZoom: 7,
    maxZoom: 18,
    zoomControl: true,
    attributionControl: false,
    worldCopyJump: false,
  })

  // Separate panes keep ecological data, boundaries and labels in a predictable order.
  map.createPane('hotspot')
  map.getPane('hotspot').style.zIndex = 300

  map.createPane('ecological')
  map.getPane('ecological').style.zIndex = 400

  map.createPane('boundaries')
  map.getPane('boundaries').style.zIndex = 500

  map.getPane('boundaries').style.pointerEvents = 'none'

  map.createPane('cityLabels')
  map.getPane('cityLabels').style.zIndex = 650

  map.getPane('cityLabels').style.pointerEvents = 'none'

  map.setView([23.7, 121], 7)

  await loadHotspotLayer()
})

onBeforeUnmount(() => {
  // Cancel any unfinished requests before destroying the map component.
  Object.values(ecologicalRequestControllers).forEach((controller) => {
    controller.abort()
  })

  if (map) {
    map.remove()
    map = null
  }
})
</script>

<template>
  <div class="map-wrapper">
    <LayerControl
      :visible-layers="visibleLayers"
      :loading-layers="loadingLayers"
      @toggle-layer="toggleLayer"
    />

    <div ref="mapContainer" class="map"></div>
  </div>
</template>

<style scoped>
.map-wrapper {
  position: relative;
  width: 100%;
  height: 100%;
}

.map {
  width: 100%;
  height: 100%;
  background: #eef3f5;
}

/* Keep city names readable over overlapping map layers. */
:deep(.city-label-container) {
  background: transparent;
  border: none;
}

:deep(.city-label) {
  white-space: nowrap;
  font-size: 12px;
  font-weight: 600;
  color: #222222;
  text-align: center;

  transform: translate(-50%, -50%);

  text-shadow:
    -1px -1px 0 #ffffff,
    1px -1px 0 #ffffff,
    -1px 1px 0 #ffffff,
    1px 1px 0 #ffffff;
}

:deep(.leaflet-popup-content h3) {
  margin-top: 0;
  margin-bottom: 10px;
}

:deep(.leaflet-popup-content p) {
  margin: 6px 0;
}

:deep(.ecological-popup) {
  min-width: 160px;
}

:deep(.hotspot-popup) {
  min-width: 190px;
}
</style>
