export const MAP_LAYERS = [
  {
    id: 'hotspot-risk',
    translationKey: 'layers.hotspotRisk',

    // This color represents the risk layer in the legend only.
    // Individual counties use their own risk-level colors.
    color: '#B85C4B',

    type: 'polygon',
  },

  {
    id: 'important-wildlife-habitats',
    translationKey: 'layers.importantWildlifeHabitats',

    // Strong emerald green.
    color: '#00A86B',

    type: 'polygon',
  },

  {
    id: 'natural-reserve-areas',
    translationKey: 'layers.naturalReserveAreas',

    // Bright pink
    color: '#FF4081',

    type: 'polygon',
  },

  {
    id: 'nature-reserves',
    translationKey: 'layers.natureReserves',

    // Violet.
    color: '#7E57C2',

    type: 'polygon',
  },

  {
    id: 'terrestrial-wildlife-protected-areas',
    translationKey: 'layers.terrestrialWildlifeProtectedAreas',

    // Strong blue.
    color: '#1976D2',

    type: 'polygon',
  },

  {
    id: 'ecological-conservation-corridors',
    translationKey: 'layers.ecologicalConservationCorridors',

    // Bright cyan.
    color: '#00BCD4',

    type: 'polygon',
  },

  {
    id: 'state-forest-management-areas',
    translationKey: 'layers.stateForestManagementAreas',

    // Orange, but brighter than the risk-layer orange.
    color: '#FF9800',

    type: 'polygon',
  },

  {
    id: 'forest-wildlife-distribution',
    translationKey: 'layers.forestWildlifeDistribution',

    // Bright magenta for point data.
    color: '#D500F9',

    type: 'point',
  },

  {
    id: 'wildlife-stray-attacks',
    translationKey: 'layers.wildlifeStrayAttacks',

    // Bright red-orange, intentionally stronger than hotspot fills.
    color: '#FF3D00',

    type: 'polygon',
  },

  {
    id: 'wildlife-rescue-centres',
    translationKey: 'layers.wildlifeRescueCentres',

    // Dark teal for rescue-centre points.
    color: '#00897B',

    type: 'point',
  },
]
