// @vitest-environment node
// frontend/src/services/api.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { fetchBusinesses } from './api'

const MOCK_RESPONSE = [
  { id: 'node/1', name: 'TechCorp', type: 'office', lat: -33.45, lon: -70.65 },
]

beforeEach(() => {
  vi.restoreAllMocks()
  // node environment has no window; provide a minimal stub
  ;(global as unknown as Record<string, unknown>).window = {
    location: { origin: 'http://localhost' },
  }
})

describe('fetchBusinesses', () => {
  it('llama a /api/search con los params correctos', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => MOCK_RESPONSE,
    } as Response)

    const result = await fetchBusinesses({ lat: -33.45, lon: -70.65, radius: 500, type: 'all' })

    expect(fetch).toHaveBeenCalledOnce()
    const url = (fetch as ReturnType<typeof vi.fn>).mock.calls[0][0] as string
    expect(url).toContain('/api/search')
    expect(url).toContain('lat=-33.45')
    expect(url).toContain('radius=500')
    expect(result).toEqual(MOCK_RESPONSE)
  })

  it('lanza Error si la respuesta no es ok', async () => {
    global.fetch = vi.fn().mockResolvedValue({ ok: false, status: 503 } as Response)
    await expect(fetchBusinesses({ lat: 0, lon: 0, radius: 500, type: 'all' })).rejects.toThrow('Error 503')
  })
})
