const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080/api'

export async function getEcologicalLayer(layerName, signal) {
  const response = await fetch(`${API_BASE_URL}/ecological-layers/${layerName}`, {
    signal,
  })

  if (!response.ok) {
    throw new Error(`Failed to load ecological layer ${layerName}: ${response.status}`)
  }

  return response.json()
}
