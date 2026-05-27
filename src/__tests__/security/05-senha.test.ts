/**
 * TESTES DE SEGURANÇA DE SENHAS
 * Verifica: validação de senha atual, requisitos mínimos, hashing.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { sessions, jsonReq } from './helpers'

vi.mock('@/auth', () => ({ auth: vi.fn() }))
vi.mock('@/infrastructure/database/prisma', () => ({
  prisma: {
    user: { findUnique: vi.fn(), create: vi.fn(), update: vi.fn() },
    siteSettings: { findUnique: vi.fn() },
  },
}))
vi.mock('bcryptjs', () => ({
  default: {
    compare: vi.fn(),
    hash: vi.fn(),
  },
  compare: vi.fn(),
  hash: vi.fn(),
}))

import { auth } from '@/auth'
import { prisma } from '@/infrastructure/database/prisma'
import bcrypt from 'bcryptjs'

const mockAuth = vi.mocked(auth)
const mockPrisma = vi.mocked(prisma)
const mockBcrypt = vi.mocked(bcrypt)

const HASHED_PASSWORD = '$2a$12$fakehashfakehashfakehashfakehash'

describe('05 – Senha: PUT /api/admin/settings/password', () => {
  beforeEach(() => {
    mockAuth.mockResolvedValue(sessions.admin as any)
    mockPrisma.user.findUnique.mockResolvedValue({
      id: sessions.admin.user.id,
      email: sessions.admin.user.email,
      passwordHash: HASHED_PASSWORD,
      role: 'ADMIN',
    } as any)
  })

  it('rejeita nova senha com menos de 8 caracteres → 400', async () => {
    const { PUT } = await import('@/app/api/admin/settings/password/route')
    const res = await PUT(jsonReq('/api/admin/settings/password', 'PUT', {
      currentPassword: 'senhaatual123',
      newPassword: '123',
    }))
    expect(res.status).toBe(400)
    const body = await res.json()
    expect(body.error).toMatch(/8 caracteres/i)
  })

  it('rejeita quando senha atual está incorreta → 400', async () => {
    mockBcrypt.compare.mockResolvedValue(false as never)

    const { PUT } = await import('@/app/api/admin/settings/password/route')
    const res = await PUT(jsonReq('/api/admin/settings/password', 'PUT', {
      currentPassword: 'senha_errada',
      newPassword: 'novasenha123',
    }))
    expect(res.status).toBe(400)
    const body = await res.json()
    expect(body.error).toMatch(/incorreta/i)
  })

  it('rejeita quando campo currentPassword está vazio → 400', async () => {
    const { PUT } = await import('@/app/api/admin/settings/password/route')
    const res = await PUT(jsonReq('/api/admin/settings/password', 'PUT', {
      currentPassword: '',
      newPassword: 'novasenha123',
    }))
    expect(res.status).toBe(400)
  })

  it('altera senha com sucesso quando dados estão corretos → 200', async () => {
    mockBcrypt.compare.mockResolvedValue(true as never)
    mockBcrypt.hash.mockResolvedValue('$2a$12$novohashnovohashnovohash' as never)
    mockPrisma.user.update.mockResolvedValue({ id: sessions.admin.user.id } as any)

    const { PUT } = await import('@/app/api/admin/settings/password/route')
    const res = await PUT(jsonReq('/api/admin/settings/password', 'PUT', {
      currentPassword: 'senhaatual123',
      newPassword: 'novasenhasegura',
    }))
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.ok).toBe(true)
  })

  it('nova senha é armazenada como hash (bcrypt), nunca em texto plano', async () => {
    const FAKE_HASH = '$2a$12$novohashnovohashnovohash'
    mockBcrypt.compare.mockResolvedValue(true as never)
    mockBcrypt.hash.mockResolvedValue(FAKE_HASH as never)
    mockPrisma.user.update.mockResolvedValue({} as any)

    const { PUT } = await import('@/app/api/admin/settings/password/route')
    await PUT(jsonReq('/api/admin/settings/password', 'PUT', {
      currentPassword: 'senhaatual123',
      newPassword: 'novasenhasegura',
    }))

    // Verifica que bcrypt.hash foi chamado com a nova senha (antes de salvar)
    expect(mockBcrypt.hash).toHaveBeenCalledWith('novasenhasegura', 12)

    // Verifica que o update no DB usa o hash, não a senha em texto plano
    const updateCall = mockPrisma.user.update.mock.calls[0][0]
    expect((updateCall.data as any).passwordHash).toBe(FAKE_HASH)
    expect((updateCall.data as any).password).toBeUndefined()
  })

  it('bcrypt usa fator de custo >= 10 (resistência a brute force)', async () => {
    mockBcrypt.compare.mockResolvedValue(true as never)
    mockBcrypt.hash.mockResolvedValue('$2a$12$hash' as never)
    mockPrisma.user.update.mockResolvedValue({} as any)

    const { PUT } = await import('@/app/api/admin/settings/password/route')
    await PUT(jsonReq('/api/admin/settings/password', 'PUT', {
      currentPassword: 'senhaatual123',
      newPassword: 'novasenhasegura',
    }))

    const [, saltRounds] = mockBcrypt.hash.mock.calls[0]
    expect(saltRounds).toBeGreaterThanOrEqual(10)
  })
})

describe('05 – Senha: POST /api/auth/register armazena hash', () => {
  it('senha é hashada com bcrypt antes de salvar no DB', async () => {
    mockPrisma.user.findUnique.mockResolvedValue(null) // e-mail não existe
    mockBcrypt.hash.mockResolvedValue('$2a$12$hashregistro' as never)
    mockPrisma.user.create.mockResolvedValue({ id: 'new-user', email: 'novo@teste.com' } as any)

    const { POST } = await import('@/app/api/auth/register/route')
    await POST(jsonReq('/api/auth/register', 'POST', {
      name: 'Novo Usuário',
      email: 'novo@teste.com',
      password: 'senhasegura123',
    }))

    // bcrypt.hash chamado com a senha em texto plano
    expect(mockBcrypt.hash).toHaveBeenCalledWith('senhasegura123', 12)

    // O create usa passwordHash (hash), não password (plain text)
    const createCall = mockPrisma.user.create.mock.calls[0][0]
    expect(createCall.data.passwordHash).toBe('$2a$12$hashregistro')
    expect((createCall.data as any).password).toBeUndefined()
  })
})
