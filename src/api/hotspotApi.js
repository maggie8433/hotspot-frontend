const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080/api'

export async function getHotspotGeo() {
  const response = await fetch(`${API_BASE_URL}/hotspots/geo`)

  if (!response.ok) {
    throw new Error(`Failed to load hotspot geographic data: ${response.status}`)
  }

  return response.json()
}
