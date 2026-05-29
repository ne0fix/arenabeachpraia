'use client'

import { useState, useCallback } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import {
  Search, Users, CalendarDays, Phone, Mail, Pencil, X,
  Loader2, Trash2, Eye, EyeOff, ShieldAlert, Save,
} from 'lucide-react'
import { Badge } from '@/views/components/ui/Badge'
import { cn } from '@/core/utils/helpers'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { motion, AnimatePresence } from 'motion/react'

// ─── Tipos ────────────────────────────────────────────────────────────────────

const STATUS_OPTIONS = [
  { value: '', label: 'Todos' },
  { value: 'ACTIVE', label: 'Ativos' },
  { value: 'INACTIVE', label: 'Inativos' },
  { value: 'BANNED', label: 'Banidos' },
]

const statusVariant: Record<string, 'success' | 'warning' | 'danger'> = {
  ACTIVE: 'success', INACTIVE: 'warning', BANNED: 'danger',
}
const statusLabel: Record<string, string> = {
  ACTIVE: 'Ativo', INACTIVE: 'Inativo', BANNED: 'Banido',
}

interface Client {
  id: string
  name: string
  email: string
  phone: string | null
  status: string
  createdAt: string
  totalBookings: number
  lastBookingAt: string | null
}

interface ClientDetail extends Client {
  cpf: string | null
  role: string
  avatarUrl: string | null
  updatedAt: string
  _count: { bookings: number }
  bookings: Array<{
    id: string
    date: string
    startTime: string
    endTime: string
    totalValue: number
    status: string
    accessCode: string
    court: { name: string }
  }>
}

interface Pagination {
  page: number
  pageSize: number
  total: number
  totalPages: number
}

// ─── Modal de edição ──────────────────────────────────────────────────────────

function ClientModal({
  clientId,
  onClose,
  onSaved,
  onDeleted,
}: {
  clientId: string
  onClose: () => void
  onSaved: () => void
  onDeleted: () => void
}) {
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const { data: client, isLoading } = useQuery<ClientDetail>({
    queryKey: ['admin-client', clientId],
    queryFn: () => fetch(`/api/admin/clients/${clientId}`).then(r => r.json()),
  })

  const [form, setForm] = useState<{
    name: string; email: string; phone: string; cpf: string; status: string; password: string
  } | null>(null)

  // Inicializa o form quando os dados chegam
  if (client && !form) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ;(setForm as any)({
      name: client.name,
      email: client.email,
      phone: client.phone ?? '',
      cpf: client.cpf ?? '',
      status: client.status,
      password: '',
    })
  }

  const handleSave = async () => {
    if (!form) return
    setSaving(true)
    setError('')
    setSuccess('')
    try {
      const body: Record<string, unknown> = {
        name: form.name,
        email: form.email,
        phone: form.phone || null,
        cpf: form.cpf || null,
        status: form.status,
      }
      if (form.password) body.password = form.password

      const res = await fetch(`/api/admin/clients/${clientId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.message ?? 'Erro ao salvar')
      setSuccess('Salvo com sucesso!')
      if (form.password) setForm(f => f ? { ...f, password: '' } : f)
      setTimeout(() => { setSuccess(''); onSaved() }, 1500)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Erro ao salvar')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    setDeleting(true)
    setError('')
    try {
      const res = await fetch(`/api/admin/clients/${clientId}`, { method: 'DELETE' })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.message ?? 'Erro ao excluir')
      }
      onDeleted()
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Erro ao excluir')
      setDeleting(false)
      setConfirmDelete(false)
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ y: 40, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 40, opacity: 0 }}
        transition={{ type: 'spring', damping: 25, stiffness: 300 }}
        className="bg-surface w-full max-w-lg rounded-3xl shadow-2xl overflow-hidden max-h-[90vh] flex flex-col"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-outline-variant/20">
          <div className="flex items-center gap-3">
            {isLoading ? (
              <div className="w-10 h-10 rounded-full bg-surface-container animate-pulse" />
            ) : (
              <div className="w-10 h-10 rounded-full bg-secondary-container flex items-center justify-center flex-shrink-0">
                <span className="font-headline text-primary font-bold">
                  {client?.name[0]?.toUpperCase() ?? '?'}
                </span>
              </div>
            )}
            <div>
              <h2 className="font-headline text-base font-bold text-on-surface">
                {isLoading ? '—' : client?.name}
              </h2>
              <p className="font-headline text-[10px] text-on-surface-variant uppercase tracking-widest">
                Editar cadastro
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-surface-container rounded-full transition-all">
            <X className="w-5 h-5 text-on-surface-variant" />
          </button>
        </div>

        {/* Conteúdo */}
        <div className="overflow-y-auto flex-1 px-6 py-5 space-y-4">
          {isLoading || !form ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
          ) : (
            <>
              {/* Dados pessoais */}
              <section className="space-y-3">
                <h3 className="font-headline text-[10px] uppercase tracking-widest text-on-surface-variant font-bold">
                  Dados pessoais
                </h3>

                <div>
                  <label className="font-headline text-[10px] uppercase tracking-wider text-on-surface-variant font-bold mb-1 block">Nome</label>
                  <input
                    value={form.name}
                    onChange={e => setForm(f => f ? { ...f, name: e.target.value } : f)}
                    className="w-full bg-surface-container border border-outline-variant/40 rounded-xl px-3 py-2.5 font-headline text-sm text-on-surface focus:outline-none focus:border-primary/50 transition-colors"
                  />
                </div>

                <div>
                  <label className="font-headline text-[10px] uppercase tracking-wider text-on-surface-variant font-bold mb-1 block">E-mail</label>
                  <input
                    type="email"
                    value={form.email}
                    onChange={e => setForm(f => f ? { ...f, email: e.target.value } : f)}
                    autoComplete="off"
                    className="w-full bg-surface-container border border-outline-variant/40 rounded-xl px-3 py-2.5 font-headline text-sm text-on-surface focus:outline-none focus:border-primary/50 transition-colors"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="font-headline text-[10px] uppercase tracking-wider text-on-surface-variant font-bold mb-1 block">Telefone</label>
                    <input
                      type="tel"
                      value={form.phone}
                      onChange={e => setForm(f => f ? { ...f, phone: e.target.value } : f)}
                      placeholder="(XX) XXXXX-XXXX"
                      className="w-full bg-surface-container border border-outline-variant/40 rounded-xl px-3 py-2.5 font-headline text-sm text-on-surface focus:outline-none focus:border-primary/50 transition-colors placeholder:text-on-surface-variant/40"
                    />
                  </div>
                  <div>
                    <label className="font-headline text-[10px] uppercase tracking-wider text-on-surface-variant font-bold mb-1 block">CPF</label>
                    <input
                      value={form.cpf}
                      onChange={e => setForm(f => f ? { ...f, cpf: e.target.value } : f)}
                      placeholder="000.000.000-00"
                      className="w-full bg-surface-container border border-outline-variant/40 rounded-xl px-3 py-2.5 font-headline text-sm text-on-surface focus:outline-none focus:border-primary/50 transition-colors placeholder:text-on-surface-variant/40"
                    />
                  </div>
                </div>

                <div>
                  <label className="font-headline text-[10px] uppercase tracking-wider text-on-surface-variant font-bold mb-1 block">Status</label>
                  <select
                    value={form.status}
                    onChange={e => setForm(f => f ? { ...f, status: e.target.value } : f)}
                    className="w-full bg-surface-container border border-outline-variant/40 rounded-xl px-3 py-2.5 font-headline text-sm text-on-surface focus:outline-none focus:border-primary/50 transition-colors"
                  >
                    <option value="ACTIVE">Ativo</option>
                    <option value="INACTIVE">Inativo</option>
                    <option value="BANNED">Banido</option>
                  </select>
                </div>
              </section>

              {/* Nova senha */}
              <section className="space-y-3">
                <h3 className="font-headline text-[10px] uppercase tracking-widest text-on-surface-variant font-bold">
                  Alterar senha
                </h3>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={form.password}
                    onChange={e => setForm(f => f ? { ...f, password: e.target.value } : f)}
                    placeholder="Deixe em branco para não alterar"
                    autoComplete="new-password"
                    className="w-full bg-surface-container border border-outline-variant/40 rounded-xl px-3 py-2.5 pr-10 font-headline text-sm text-on-surface focus:outline-none focus:border-primary/50 transition-colors placeholder:text-on-surface-variant/40"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(v => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-on-surface-variant hover:text-primary transition-colors"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </section>

              {/* Resumo de agendamentos */}
              {client && client.bookings.length > 0 && (
                <section className="space-y-2">
                  <h3 className="font-headline text-[10px] uppercase tracking-widest text-on-surface-variant font-bold">
                    Últimos agendamentos ({client._count.bookings} total)
                  </h3>
                  <div className="space-y-1.5">
                    {client.bookings.map(b => (
                      <div key={b.id} className="flex items-center justify-between bg-surface-container rounded-xl px-3 py-2">
                        <div>
                          <p className="font-headline text-xs font-bold text-on-surface">{b.court.name}</p>
                          <p className="font-headline text-[10px] text-on-surface-variant">
                            {format(new Date(b.date), "dd/MM/yy", { locale: ptBR })} · {b.startTime}–{b.endTime}
                          </p>
                        </div>
                        <Badge variant={statusVariant[b.status] ?? 'default'}>
                          {statusLabel[b.status] ?? b.status}
                        </Badge>
                      </div>
                    ))}
                  </div>
                </section>
              )}

              {/* Info readonly */}
              {client && (
                <div className="flex gap-4 text-[10px] text-on-surface-variant font-headline pt-1">
                  <span>Cadastro: {format(new Date(client.createdAt), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}</span>
                  <span>·</span>
                  <span>ID: {client.id.slice(0, 8)}…</span>
                </div>
              )}
            </>
          )}

          {error && (
            <p className="font-headline text-xs text-red-600 bg-red-50 border border-red-200 rounded-xl px-3 py-2">
              {error}
            </p>
          )}
          {success && (
            <p className="font-headline text-xs text-green-700 bg-green-50 border border-green-200 rounded-xl px-3 py-2">
              {success}
            </p>
          )}
        </div>

        {/* Footer */}
        {form && (
          <div className="px-6 py-4 border-t border-outline-variant/20 flex items-center gap-3">
            {/* Excluir */}
            {!confirmDelete ? (
              <button
                onClick={() => setConfirmDelete(true)}
                className="p-2.5 rounded-xl border border-red-200 text-red-500 hover:bg-red-50 transition-all"
                title="Excluir cliente"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            ) : (
              <div className="flex items-center gap-2">
                <span className="font-headline text-xs text-red-600 font-bold flex items-center gap-1">
                  <ShieldAlert className="w-3.5 h-3.5" /> Confirmar exclusão?
                </span>
                <button
                  onClick={handleDelete}
                  disabled={deleting}
                  className="px-3 py-1.5 bg-red-600 text-white rounded-lg font-headline text-[10px] font-bold uppercase hover:bg-red-700 disabled:opacity-50 transition-all"
                >
                  {deleting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : 'Sim, excluir'}
                </button>
                <button
                  onClick={() => setConfirmDelete(false)}
                  className="px-3 py-1.5 bg-surface-container rounded-lg font-headline text-[10px] font-bold uppercase hover:bg-outline-variant/30 transition-all"
                >
                  Cancelar
                </button>
              </div>
            )}

            <div className="flex-1" />

            <button
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl border border-outline-variant/40 font-headline text-xs font-bold text-on-surface-variant hover:bg-surface-container transition-all"
            >
              Fechar
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex items-center gap-2 px-5 py-2.5 bg-primary text-white rounded-xl font-headline text-xs font-bold uppercase hover:bg-primary/90 disabled:opacity-50 transition-all"
            >
              {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
              Salvar
            </button>
          </div>
        )}
      </motion.div>
    </motion.div>
  )
}

// ─── Página principal ──────────────────────────────────────────────────────────

export default function ClientsPage() {
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState('')
  const [page, setPage] = useState(1)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const queryClient = useQueryClient()

  const fetchClients = useCallback(async () => {
    const params = new URLSearchParams()
    if (search) params.set('search', search)
    if (status) params.set('status', status)
    params.set('page', String(page))
    const res = await fetch(`/api/admin/clients?${params}`)
    if (!res.ok) throw new Error('Erro ao carregar clientes')
    return res.json() as Promise<{ clients: Client[]; pagination: Pagination }>
  }, [search, status, page])

  const { data, isLoading } = useQuery({
    queryKey: ['admin-clients', search, status, page],
    queryFn: fetchClients,
  })

  const clients = data?.clients ?? []
  const pagination = data?.pagination

  const handleSearch = (value: string) => { setSearch(value); setPage(1) }
  const handleStatus = (value: string) => { setStatus(value); setPage(1) }

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['admin-clients'] })
    queryClient.invalidateQueries({ queryKey: ['admin-client', selectedId] })
  }

  const handleSaved = () => { invalidate(); setSelectedId(null) }
  const handleDeleted = () => { invalidate(); setSelectedId(null) }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-headline text-2xl text-on-surface font-bold">Clientes</h1>
          <p className="font-headline text-xs text-on-surface-variant uppercase tracking-widest">
            {pagination ? `${pagination.total} cadastrados` : '—'}
          </p>
        </div>
      </div>

      {/* Filtros */}
      <div className="flex flex-wrap gap-3">
        <div className="flex items-center gap-2 bg-surface-container-lowest border border-outline-variant/30 rounded-xl px-4 py-2.5 flex-1 min-w-56">
          <Search className="w-4 h-4 text-outline flex-shrink-0" />
          <input
            value={search}
            onChange={(e) => handleSearch(e.target.value)}
            placeholder="Buscar por nome, e-mail ou telefone..."
            className="bg-transparent border-none p-0 focus:ring-0 font-sans text-sm text-on-surface placeholder:text-outline-variant outline-none flex-1"
          />
        </div>

        <div className="flex gap-2 overflow-x-auto">
          {STATUS_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              onClick={() => handleStatus(opt.value)}
              className={cn(
                'flex-shrink-0 px-4 py-2 rounded-xl font-headline text-xs font-bold transition-all',
                status === opt.value
                  ? 'bg-primary text-white'
                  : 'bg-surface-container text-on-surface-variant hover:bg-secondary-container'
              )}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* Tabela */}
      <div className="bg-surface-container-lowest rounded-2xl border border-outline-variant/30 sun-shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-outline-variant/20 bg-surface-container/50">
                <th className="text-left px-6 py-4 font-headline text-xs text-on-surface-variant uppercase tracking-widest">Cliente</th>
                <th className="text-left px-6 py-4 font-headline text-xs text-on-surface-variant uppercase tracking-widest hidden md:table-cell">Contato</th>
                <th className="text-left px-6 py-4 font-headline text-xs text-on-surface-variant uppercase tracking-widest">Status</th>
                <th className="text-left px-6 py-4 font-headline text-xs text-on-surface-variant uppercase tracking-widest hidden lg:table-cell">Agendamentos</th>
                <th className="text-left px-6 py-4 font-headline text-xs text-on-surface-variant uppercase tracking-widest hidden lg:table-cell">Cadastro</th>
                <th className="px-6 py-4" />
              </tr>
            </thead>
            <tbody className="divide-y divide-outline-variant/20">
              {isLoading ? (
                Array.from({ length: 8 }).map((_, i) => (
                  <tr key={i}>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full bg-surface-container animate-pulse" />
                        <div className="space-y-1.5">
                          <div className="h-3 w-32 bg-surface-container animate-pulse rounded" />
                          <div className="h-2.5 w-44 bg-surface-container animate-pulse rounded" />
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 hidden md:table-cell"><div className="h-3 w-28 bg-surface-container animate-pulse rounded" /></td>
                    <td className="px-6 py-4"><div className="h-5 w-16 bg-surface-container animate-pulse rounded-full" /></td>
                    <td className="px-6 py-4 hidden lg:table-cell"><div className="h-3 w-10 bg-surface-container animate-pulse rounded" /></td>
                    <td className="px-6 py-4 hidden lg:table-cell"><div className="h-3 w-24 bg-surface-container animate-pulse rounded" /></td>
                    <td className="px-6 py-4" />
                  </tr>
                ))
              ) : clients.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-16 text-center">
                    <Users className="w-10 h-10 text-outline mx-auto mb-3" />
                    <p className="font-headline text-sm text-on-surface-variant font-bold">Nenhum cliente encontrado</p>
                    {search && <p className="font-headline text-xs text-outline mt-1">Tente buscar por outro termo</p>}
                  </td>
                </tr>
              ) : (
                clients.map((client) => (
                  <tr key={client.id} className="hover:bg-surface-container/30 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full bg-secondary-container flex items-center justify-center flex-shrink-0">
                          <span className="font-headline text-primary font-bold text-sm">
                            {client.name[0]?.toUpperCase() ?? '?'}
                          </span>
                        </div>
                        <div>
                          <p className="font-headline text-sm text-on-surface font-bold">{client.name}</p>
                          <p className="font-sans text-xs text-on-surface-variant flex items-center gap-1 mt-0.5">
                            <Mail className="w-3 h-3" />{client.email}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 hidden md:table-cell">
                      {client.phone ? (
                        <p className="font-sans text-sm text-on-surface flex items-center gap-1.5">
                          <Phone className="w-3.5 h-3.5 text-outline" />{client.phone}
                        </p>
                      ) : (
                        <span className="font-sans text-xs text-outline-variant">—</span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <Badge variant={statusVariant[client.status] ?? 'default'}>
                        {statusLabel[client.status] ?? client.status}
                      </Badge>
                    </td>
                    <td className="px-6 py-4 hidden lg:table-cell">
                      <div className="flex items-center gap-1.5">
                        <CalendarDays className="w-3.5 h-3.5 text-outline" />
                        <span className="font-headline text-sm text-on-surface font-bold">{client.totalBookings}</span>
                        {client.lastBookingAt && (
                          <span className="font-sans text-xs text-on-surface-variant">
                            · último {format(new Date(client.lastBookingAt), "dd/MM/yy", { locale: ptBR })}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 hidden lg:table-cell">
                      <span className="font-sans text-xs text-on-surface-variant">
                        {format(new Date(client.createdAt), "dd/MM/yyyy", { locale: ptBR })}
                      </span>
                    </td>
                    {/* Botão editar */}
                    <td className="px-4 py-4">
                      <button
                        onClick={() => setSelectedId(client.id)}
                        className="p-2 rounded-xl border border-outline-variant/30 text-on-surface-variant hover:bg-primary/10 hover:text-primary hover:border-primary/30 transition-all"
                        title="Visualizar / Editar cliente"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Paginação */}
        {pagination && pagination.totalPages > 1 && (
          <div className="flex items-center justify-between px-6 py-4 border-t border-outline-variant/20">
            <p className="font-headline text-xs text-on-surface-variant">
              Página {pagination.page} de {pagination.totalPages}
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => setPage((p) => p - 1)}
                disabled={page === 1}
                className="px-4 py-2 rounded-xl border border-outline-variant/30 font-headline text-sm font-bold disabled:opacity-40 hover:bg-surface-container transition-all"
              >
                Anterior
              </button>
              <button
                onClick={() => setPage((p) => p + 1)}
                disabled={page === pagination.totalPages}
                className="px-4 py-2 rounded-xl border border-outline-variant/30 font-headline text-sm font-bold disabled:opacity-40 hover:bg-surface-container transition-all"
              >
                Próxima
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Modal */}
      <AnimatePresence>
        {selectedId && (
          <ClientModal
            clientId={selectedId}
            onClose={() => setSelectedId(null)}
            onSaved={handleSaved}
            onDeleted={handleDeleted}
          />
        )}
      </AnimatePresence>
    </div>
  )
}
