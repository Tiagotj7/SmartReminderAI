import 'dotenv/config'
import { PrismaClient } from '../src/generated/prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'

// Prisma 7 não conecta mais sozinho: precisa de um adapter de driver.
// Usamos a DIRECT_URL (sem pgbouncer) pois o seed roda uma vez só,
// fora do hot-path da aplicação.
const adapter = new PrismaPg({ connectionString: process.env.DIRECT_URL })
const prisma = new PrismaClient({ adapter })

async function main() {
  console.log('🌱 Iniciando seed...')

  // ── Categorias padrão ──
  const categories = await Promise.all([
    prisma.category.upsert({
      where:  { slug: 'geral' },
      update: {},
      create: { name: 'Geral', slug: 'geral', emoji: '📌', color: '#64748b' },
    }),
    prisma.category.upsert({
      where:  { slug: 'trabalho' },
      update: {},
      create: { name: 'Trabalho', slug: 'trabalho', emoji: '💼', color: '#3b82f6' },
    }),
    prisma.category.upsert({
      where:  { slug: 'saude' },
      update: {},
      create: { name: 'Saúde', slug: 'saude', emoji: '❤️', color: '#ef4444' },
    }),
    prisma.category.upsert({
      where:  { slug: 'financeiro' },
      update: {},
      create: { name: 'Financeiro', slug: 'financeiro', emoji: '💰', color: '#22c55e' },
    }),
    prisma.category.upsert({
      where:  { slug: 'pessoal' },
      update: {},
      create: { name: 'Pessoal', slug: 'pessoal', emoji: '👤', color: '#a855f7' },
    }),
    prisma.category.upsert({
      where:  { slug: 'estudo' },
      update: {},
      create: { name: 'Estudo', slug: 'estudo', emoji: '📚', color: '#eab308' },
    }),
    prisma.category.upsert({
      where:  { slug: 'familia' },
      update: {},
      create: { name: 'Família', slug: 'familia', emoji: '👨‍👩‍👧', color: '#ec4899' },
    }),
    prisma.category.upsert({
      where:  { slug: 'lazer' },
      update: {},
      create: { name: 'Lazer', slug: 'lazer', emoji: '🎮', color: '#f97316' },
    }),
  ])

  console.log(`✅ ${categories.length} categorias criadas`)
  console.log('✅ Seed concluído!')
}

main()
  .catch((e) => {
    console.error('❌ Erro no seed:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })