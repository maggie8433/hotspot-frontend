<script setup>
import { onMounted, onBeforeUnmount, reactive, ref, watch } from 'vue'

import { useI18n } from 'vue-i18n'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'

import { getHotspotGeo } from '@/api/hotspotApi'
import { getEcologicalLayer } from '@/api/ecologicalLayerApi'
import { getWildlifeAttackGeo } from '@/api/wildlifeAttackApi'
import LayerControl from '@/components/map/LayerControl.vue'
import { getWildlifeRescueCentresGeo } from '@/api/wildlifeRescueCentreApi'

const mapContainer = ref(null)

const { locale, t } = useI18n({
  useScope: 'global',
})

let map = null
let hotspotLayer = null
let taiwanBoundaryLayer = null
let cityLabelLayer = null
let hotspotGeoJson = null
let wildlifeAttackLayer = null
let wildlifeRescueCentreLayer = null

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
  'wildlife-stray-attacks': false,
  'wildlife-rescue-centres': false,
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
  'wildlife-stray-attacks': false,
  'wildlife-rescue-centres': false,
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
// show WildlifeAttack
function wildlifeAttackStyle() {
  return {
    color: '#D84315',
    weight: 3,
    opacity: 1,
    fillColor: '#F4511E',
    fillOpacity: 0.45,
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

  // Build the popup when the user clicks so the current language is used.
  layer.on('click', (event) => {
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

    L.popup({
      maxWidth: 300,

      // Do not move the whole map when the popup opens.
      autoPan: false,
    })
      .setLatLng(event.latlng)
      .setContent(popupContent)
      .openOn(map)
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

function bindWildlifeAttackPopup(feature, layer) {
  const properties = feature.properties || {}

  layer.on('click', () => {
    const cityName = isChinese()
      ? properties.cityNameZh || properties.cityNameEn || '-'
      : properties.cityNameEn || properties.cityNameZh || '-'

    const deathRate =
      properties.deathRate !== null && properties.deathRate !== undefined
        ? `${Number(properties.deathRate).toFixed(2)}%`
        : '-'

    const popupContent = `
      <div class="wildlife-attack-popup">

        <h3>
          ${cityName}
        </h3>

        <h4>
          ${t('wildlifeAttack.title')}
        </h4>

        <p>
          <strong>
            ${t('wildlifeAttack.deathRate')}:
          </strong>

          ${deathRate}
        </p>

        <p>
          <strong>
            ${t('wildlifeAttack.totalAttacks')}:
          </strong>

          ${properties.totalAttacks ?? '-'}
        </p>

        <hr>

        <p>
          <strong>
            ${t('wildlifeAttack.dogAttacks')}:
          </strong>

          ${properties.dogAttacks ?? '-'}
        </p>

        <p>
          <strong>
            ${t('wildlifeAttack.catAttacks')}:
          </strong>

          ${properties.catAttacks ?? '-'}
        </p>

        <hr>

        <p>
          <strong>
            ${t('wildlifeAttack.protectedSpecies')}:
          </strong>

          ${properties.protectedSpeciesCount ?? '-'}
        </p>

        <p>
          <strong>
            ${t('wildlifeAttack.generalSpecies')}:
          </strong>

          ${properties.generalSpeciesCount ?? '-'}
        </p>

        <p class="wildlife-attack-note">
          ${t('wildlifeAttack.locationNote')}
        </p>

      </div>
    `

    layer
      .bindPopup(popupContent, {
        maxWidth: 330,
      })
      .openPopup()
  })
}

async function loadWildlifeAttackLayer(signal) {
  if (wildlifeAttackLayer) {
    return wildlifeAttackLayer
  }

  const geoJson = await getWildlifeAttackGeo(signal)

  if (signal.aborted) {
    return null
  }

  if (!geoJson || !geoJson.features || geoJson.features.length === 0) {
    throw new Error('No wildlife attack data returned.')
  }

  wildlifeAttackLayer = L.geoJSON(geoJson, {
    pane: 'wildlifeAttack',

    style: wildlifeAttackStyle,

    onEachFeature(feature, featureLayer) {
      bindWildlifeAttackPopup(feature, featureLayer)
    },
  })

  leafletLayers['wildlife-stray-attacks'] = wildlifeAttackLayer

  return wildlifeAttackLayer
}

function getRescueCentreName(properties) {
  if (!properties) {
    return '-'
  }

  if (isChinese()) {
    return properties.nameZh || properties.nameEn || '-'
  }

  return properties.nameEn || properties.nameZh || '-'
}

function getRescueCentreAddress(properties) {
  if (!properties) {
    return '-'
  }

  if (isChinese()) {
    return properties.addressZh || properties.addressEn || '-'
  }

  return properties.addressEn || properties.addressZh || '-'
}

function getRescueCentreAnimalScope(properties) {
  if (!properties) {
    return '-'
  }

  if (isChinese()) {
    return properties.animalScopeZh || properties.animalScopeEn || '-'
  }

  return properties.animalScopeEn || properties.animalScopeZh || '-'
}

function getRescueCentreNotes(properties) {
  if (!properties) {
    return '-'
  }

  if (isChinese()) {
    return properties.notesZh || properties.notesEn || '-'
  }

  return properties.notesEn || properties.notesZh || '-'
}

function rescueCentreMarker(feature, latlng) {
  return L.circleMarker(latlng, {
    pane: 'wildlifeRescueCentres',

    radius: 8,

    color: '#00695C',

    weight: 2,

    opacity: 1,

    fillColor: '#26A69A',

    fillOpacity: 0.95,
  })
}

function bindRescueCentrePopup(feature, layer) {
  const properties = feature.properties || {}

  layer.on('click', () => {
    const name = getRescueCentreName(properties)

    const address = getRescueCentreAddress(properties)

    const animalScope = getRescueCentreAnimalScope(properties)

    const notes = getRescueCentreNotes(properties)

    const phone = properties.phone || '-'

    const popupContent = `
        <div class="rescue-centre-popup">

          <h3>
            ${name}
          </h3>

          <div class="rescue-centre-row">
            <strong>
              ${t('wildlifeRescue.address')}:
            </strong>

            <span>
              ${address}
            </span>
          </div>

          <div class="rescue-centre-row">
            <strong>
              ${t('wildlifeRescue.phone')}:
            </strong>

            <a href="tel:${phone}">
              ${phone}
            </a>
          </div>

          <div class="rescue-centre-row">
            <strong>
              ${t('wildlifeRescue.animalScope')}:
            </strong>

            <span>
              ${animalScope}
            </span>
          </div>

          <div class="rescue-centre-row">
            <strong>
              ${t('wildlifeRescue.notes')}:
            </strong>

            <span>
              ${notes}
            </span>
          </div>

          <div class="rescue-centre-warning">
            ${t('wildlifeRescue.contactFirst')}
          </div>

        </div>
      `

    layer
      .bindPopup(popupContent, {
        maxWidth: 360,
      })
      .openPopup()
  })
}

async function loadWildlifeRescueCentreLayer(signal) {
  if (wildlifeRescueCentreLayer) {
    return wildlifeRescueCentreLayer
  }

  const geoJson = await getWildlifeRescueCentresGeo(signal)

  if (signal.aborted) {
    return null
  }

  if (!geoJson || !Array.isArray(geoJson.features)) {
    throw new Error('Invalid wildlife rescue centre GeoJSON.')
  }

  wildlifeRescueCentreLayer = L.geoJSON(geoJson, {
    pane: 'wildlifeRescueCentres',

    pointToLayer: rescueCentreMarker,

    onEachFeature(feature, featureLayer) {
      bindRescueCentrePopup(feature, featureLayer)
    },
  })

  leafletLayers['wildlife-rescue-centres'] = wildlifeRescueCentreLayer

  return wildlifeRescueCentreLayer
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

  if (layerName === 'wildlife-stray-attacks') {
    if (!shouldShow) {
      const controller = ecologicalRequestControllers[layerName]

      if (controller) {
        controller.abort()

        delete ecologicalRequestControllers[layerName]
      }

      loadingLayers[layerName] = false

      if (wildlifeAttackLayer && map.hasLayer(wildlifeAttackLayer)) {
        map.removeLayer(wildlifeAttackLayer)
      }

      return
    }

    if (wildlifeAttackLayer) {
      wildlifeAttackLayer.addTo(map)
      return
    }

    try {
      loadingLayers[layerName] = true

      const controller = new AbortController()

      ecologicalRequestControllers[layerName] = controller

      const layer = await loadWildlifeAttackLayer(controller.signal)

      if (controller.signal.aborted) {
        return
      }

      if (!visibleLayers[layerName]) {
        return
      }

      if (layer) {
        layer.addTo(map)
      }

      delete ecologicalRequestControllers[layerName]
    } catch (error) {
      if (error.name === 'AbortError') {
        return
      }

      visibleLayers[layerName] = false

      console.error('Unable to load wildlife attack layer:', error)
    } finally {
      loadingLayers[layerName] = false
    }

    return
  }

  if (layerName === 'wildlife-rescue-centres') {
    if (!shouldShow) {
      const controller = ecologicalRequestControllers[layerName]

      if (controller) {
        controller.abort()

        delete ecologicalRequestControllers[layerName]
      }

      loadingLayers[layerName] = false

      if (wildlifeRescueCentreLayer && map.hasLayer(wildlifeRescueCentreLayer)) {
        map.removeLayer(wildlifeRescueCentreLayer)
      }

      return
    }

    if (wildlifeRescueCentreLayer) {
      wildlifeRescueCentreLayer.addTo(map)

      return
    }

    try {
      loadingLayers[layerName] = true

      const controller = new AbortController()

      ecologicalRequestControllers[layerName] = controller

      const layer = await loadWildlifeRescueCentreLayer(controller.signal)

      if (controller.signal.aborted) {
        return
      }

      if (!visibleLayers[layerName]) {
        return
      }

      if (layer) {
        layer.addTo(map)
      }

      delete ecologicalRequestControllers[layerName]
    } catch (error) {
      if (error.name === 'AbortError') {
        return
      }

      visibleLayers[layerName] = false

      console.error('Unable to load wildlife rescue centres:', error)
    } finally {
      loadingLayers[layerName] = false
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

  map.createPane('wildlifeAttack')
  map.getPane('wildlifeAttack').style.zIndex = 450

  map.createPane('wildlifeRescueCentres')

  map.getPane('wildlifeRescueCentres').style.zIndex = 610

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

:deep(.wildlife-attack-popup) {
  min-width: 230px;
}

:deep(.wildlife-attack-popup h3) {
  margin-top: 0;
  margin-bottom: 4px;
}

:deep(.wildlife-attack-popup h4) {
  margin-top: 0;
  margin-bottom: 12px;

  font-size: 13px;
  font-weight: 600;

  color: #d84315;
}

:deep(.wildlife-attack-popup p) {
  margin: 6px 0;
}

:deep(.wildlife-attack-note) {
  margin-top: 12px !important;

  padding-top: 8px;

  border-top: 1px solid #dddddd;

  font-size: 11px;
  line-height: 1.4;

  color: #666666;
}

:deep(.rescue-centre-popup) {
  min-width: 250px;
}

:deep(.rescue-centre-popup h3) {
  margin: 0 0 12px;

  font-size: 16px;
  line-height: 1.35;

  color: #00695c;
}

:deep(.rescue-centre-row) {
  display: flex;
  flex-direction: column;

  margin-bottom: 9px;
}

:deep(.rescue-centre-row strong) {
  margin-bottom: 2px;

  font-size: 12px;

  color: #555;
}

:deep(.rescue-centre-row span),
:deep(.rescue-centre-row a) {
  font-size: 13px;
  line-height: 1.45;
}

:deep(.rescue-centre-row a) {
  text-decoration: none;

  color: #00695c;
}

:deep(.rescue-centre-warning) {
  margin-top: 12px;

  padding: 9px 10px;

  border-radius: 6px;

  background: #f2f7f5;

  font-size: 11px;
  line-height: 1.45;

  color: #555;
}
</style>
