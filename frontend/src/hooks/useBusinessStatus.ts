import { useState, useCallback } from 'react'

export type BusinessStatus = 'interesado' | 'postule' | 'ya_fui' | 'descartado'

type StatusMap = Record<string, BusinessStatus>

const STORAGE_KEY = 'mapa_empresas_status'

function load(): StatusMap {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '{}')
  } catch {
    return {}
  }
}

function save(map: StatusMap) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(map))
}

export function useBusinessStatus() {
  const [statuses, setStatuses] = useState<StatusMap>(load)

  const setStatus = useCallback((id: string, status: BusinessStatus | null) => {
    setStatuses((prev) => {
      const next = { ...prev }
      if (status === null) delete next[id]
      else next[id] = status
      save(next)
      return next
    })
  }, [])

  return { statuses, setStatus }
}
