const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080/api'

export async function getWildlifeAttackGeo(signal) {
  const response = await fetch(`${API_BASE_URL}/wildlife-attacks/geo`, {
    signal,
  })

  if (!response.ok) {
    throw new Error(`Failed to load wildlife attack data: ${response.status}`)
  }

  return response.json()
}
