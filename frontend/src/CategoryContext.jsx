import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { api } from './api'
import { useAuth } from './AuthContext'
import {
  BUILTIN_CATEGORIES,
  categoryChartColor as chartColorFromList,
  categoryColors as colorsFromList,
  categoryLabel as labelFromList,
} from './constants'

const CategoryContext = createContext(null)

export function CategoryProvider({ children }) {
  const { token } = useAuth()
  const [categories, setCategories] = useState(BUILTIN_CATEGORIES)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const refresh = useCallback(async () => {
    if (!token) {
      setCategories(BUILTIN_CATEGORIES)
      return BUILTIN_CATEGORIES
    }
    setLoading(true)
    setError('')
    try {
      const rows = await api.listCategories(token)
      const mapped = (rows || []).map((row) => ({
        id: row.id,
        label: row.label,
        color: row.color,
        builtin: Boolean(row.builtin),
      }))
      setCategories(mapped.length ? mapped : BUILTIN_CATEGORIES)
      return mapped
    } catch (err) {
      setError(err.message || 'Failed to load categories')
      setCategories(BUILTIN_CATEGORIES)
      return BUILTIN_CATEGORIES
    } finally {
      setLoading(false)
    }
  }, [token])

  useEffect(() => {
    refresh()
  }, [refresh])

  const customCategories = useMemo(
    () => categories.filter((c) => !c.builtin),
    [categories],
  )

  const value = useMemo(
    () => ({
      categories,
      customCategories,
      loading,
      error,
      refresh,
      categoryLabel: (id) => labelFromList(id, categories),
      categoryColors: (id) => colorsFromList(id, categories),
      categoryChartColor: (id) => chartColorFromList(id, categories),
      async createCategory({ label, color }) {
        const created = await api.createCategory(token, { label, color })
        await refresh()
        return created
      },
      async updateCategory(id, body) {
        const updated = await api.updateCategory(token, id, body)
        await refresh()
        return updated
      },
      async deleteCategory(id) {
        await api.deleteCategory(token, id)
        await refresh()
      },
    }),
    [categories, customCategories, loading, error, refresh, token],
  )

  return <CategoryContext.Provider value={value}>{children}</CategoryContext.Provider>
}

export function useCategories() {
  const ctx = useContext(CategoryContext)
  // Fall back during HMR / partial remounts so pages don't go blank.
  if (!ctx) {
    return {
      categories: BUILTIN_CATEGORIES,
      customCategories: [],
      loading: false,
      error: '',
      refresh: async () => BUILTIN_CATEGORIES,
      categoryLabel: (id) => labelFromList(id, BUILTIN_CATEGORIES),
      categoryColors: (id) => colorsFromList(id, BUILTIN_CATEGORIES),
      categoryChartColor: (id) => chartColorFromList(id, BUILTIN_CATEGORIES),
      createCategory: async () => {
        throw new Error('Categories are still loading. Refresh the page and try again.')
      },
      updateCategory: async () => {
        throw new Error('Categories are still loading. Refresh the page and try again.')
      },
      deleteCategory: async () => {
        throw new Error('Categories are still loading. Refresh the page and try again.')
      },
    }
  }
  return ctx
}
