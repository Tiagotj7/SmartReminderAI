import { supabase } from '../lib/supabase'
import type { Category } from '../types'

export interface CategoryRow {
  id: string
  slug: string
  name: string
  emoji: string
  color: string
}

// Cache simples em memória — categorias são poucas e mudam raramente.
let cache: CategoryRow[] | null = null
let inFlight: Promise<CategoryRow[]> | null = null

async function loadCategories(): Promise<CategoryRow[]> {
  const { data, error } = await supabase
    .from('categories')
    .select('id, slug, name, emoji, color')

  if (error) throw new Error(error.message)
  return data as CategoryRow[]
}

// ═══════════════════════════════════════════════════════
// BUSCAR TODAS AS CATEGORIAS (com cache)
// ═══════════════════════════════════════════════════════
export async function fetchCategories(): Promise<CategoryRow[]> {
  if (cache) return cache
  if (!inFlight) {
    inFlight = loadCategories().then((rows) => {
      cache = rows
      inFlight = null
      return rows
    })
  }
  return inFlight
}

// ═══════════════════════════════════════════════════════
// RESOLVER slug (ex.: "trabalho") → category_id (uuid)
// ═══════════════════════════════════════════════════════
export async function resolveCategoryId(
  slug: Category | undefined
): Promise<string | null> {
  if (!slug) return null
  const categories = await fetchCategories()
  return categories.find((c) => c.slug === slug)?.id ?? null
}

// Limpa o cache (útil se as categorias forem editadas em runtime)
export function invalidateCategoryCache(): void {
  cache = null
}
