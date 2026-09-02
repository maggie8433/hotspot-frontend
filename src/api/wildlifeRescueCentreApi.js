const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080/api'

export async function getWildlifeRescueCentresGeo(signal) {
  const response = await fetch(`${API_BASE_URL}/wildlife-rescue-centres/geo`, {
    signal,
  })

  if (!response.ok) {
    throw new Error(`Failed to load wildlife rescue centres: ${response.status}`)
  }

  return response.json()
}
