'use client'

import { useState, useRef, useCallback, useEffect } from 'react'
import { useSocket } from '@/views/providers/SocketProvider'
import Image from 'next/image'
import {
  ChevronLeft, ChevronRight, Plus, Trash2, Save, X,
  ImageIcon, DollarSign, FileText, Eye, Upload, Link2, Loader2, MessageCircle,
} from 'lucide-react'
import { formatCurrency } from '@/core/utils/formatCurrency'
import type { Court } from '@/models/entities/Court'

interface Props {
  initialCourts: Court[]
  hideTitle?: boolean
}

interface CourtDraft {
  name: string
  description: string
  pricePerHour: number
  maxPlayers: number
  showCapacity: boolean
  courtWhatsapp: string
  images: string[]
  sports: string[]
}

// ─── Mini carousel de preview ─────────────────────────────────────────────────

function ImageCarouselPreview({ images, name }: { images: string[]; name: string }) {
  const [current, setCurrent] = useState(0)
  const hasMultiple = images.length > 1

  if (images.length === 0) {
    return (
      <div className="w-full h-full bg-secondary-container flex flex-col items-center justify-center gap-2">
        <ImageIcon className="w-8 h-8 text-primary/40" />
        <span className="font-headline text-xs text-on-surface-variant">Sem imagens</span>
      </div>
    )
  }

  return (
    <div className="relative w-full h-full">
      <Image
        key={images[current]}
        src={images[current]}
        alt={`${name} ${current + 1}`}
        fill
        className="object-cover"
      />
      {hasMultiple && (
        <>
          <button
            type="button"
            onClick={() => setCurrent((c) => (c - 1 + images.length) % images.length)}
            className="absolute left-1 top-1/2 -translate-y-1/2 bg-black/50 text-white rounded-full p-0.5 hover:bg-black/70 transition-all"
          >
            <ChevronLeft className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={() => setCurrent((c) => (c + 1) % images.length)}
            className="absolute right-1 top-1/2 -translate-y-1/2 bg-black/50 text-white rounded-full p-0.5 hover:bg-black/70 transition-all"
          >
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
          <div className="absolute bottom-1.5 left-1/2 -translate-x-1/2 flex gap-1">
            {images.map((_, i) => (
              <button
                key={i}
                type="button"
                onClick={() => setCurrent(i)}
                className={`w-1.5 h-1.5 rounded-full transition-all ${i === current ? 'bg-white scale-125' : 'bg-white/50'}`}
              />
            ))}
          </div>
        </>
      )}
    </div>
  )
}

// ─── Editor de quadra ──────────────────────────────────────────────────────────

function CourtEditor({ court, onSaved }: { court: Court; onSaved: (updated: Court) => void }) {
  const initialImages = court.images.length > 0 ? [...court.images] : court.imageUrl ? [court.imageUrl] : []

  const [draft, setDraft] = useState<CourtDraft>({
    name: court.name,
    description: court.description,
    pricePerHour: court.pricePerHour,
    maxPlayers: Math.min(Math.max(court.maxPlayers, 1), 12),
    showCapacity: court.showCapacity,
    courtWhatsapp: court.courtWhatsapp ?? '',
    images: initialImages,
    sports: court.sports ?? [],
  })
  const [sportInput, setSportInput] = useState('')

  const [urlInput, setUrlInput] = useState('')
  const [addMode, setAddMode] = useState<'upload' | 'url'>('upload')
  const [uploading, setUploading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState('')
  const [dragOver, setDragOver] = useState(false)

  const fileInputRef = useRef<HTMLInputElement>(null)

  const addImageUrl = (url: string) => {
    const u = url.trim()
    if (!u) return
    if (draft.images.includes(u)) { setError('URL já adicionada'); return }
    setDraft((d) => ({ ...d, images: [...d.images, u] }))
    setUrlInput('')
    setError('')
  }

  const uploadFile = useCallback(async (file: File) => {
    if (!file.type.startsWith('image/')) { setError('Envie apenas imagens.'); return }
    if (file.size > 5 * 1024 * 1024) { setError('Máximo 5MB por imagem.'); return }

    setUploading(true)
    setError('')
    try {
      const form = new FormData()
      form.append('file', file)
      const res = await fetch('/api/admin/upload', { method: 'POST', body: form })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Falha no upload')
      setDraft((d) => ({ ...d, images: [...d.images, data.url] }))
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Erro no upload')
    } finally {
      setUploading(false)
    }
  }, [])

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? [])
    files.forEach(uploadFile)
    e.target.value = ''
  }

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(false)
    const files = Array.from(e.dataTransfer.files).filter((f) => f.type.startsWith('image/'))
    files.forEach(uploadFile)
  }, [uploadFile])

  const removeImage = (idx: number) => {
    setDraft((d) => ({ ...d, images: d.images.filter((_, i) => i !== idx) }))
  }

  const moveImage = (from: number, to: number) => {
    const imgs = [...draft.images]
    const [item] = imgs.splice(from, 1)
    imgs.splice(to, 0, item)
    setDraft((d) => ({ ...d, images: imgs }))
  }

  const handleSave = async () => {
    setSaving(true)
    setError('')
    try {
      const res = await fetch(`/api/admin/courts/${court.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: draft.name,
          description: draft.description,
          pricePerHour: draft.pricePerHour,
          maxPlayers: draft.maxPlayers,
          showCapacity: draft.showCapacity,
          courtWhatsapp: draft.courtWhatsapp.trim(),
          images: draft.images,
          sports: draft.sports,
        }),
      })
      if (!res.ok) throw new Error('Erro ao salvar')
      const updated = await res.json()
      onSaved(updated)
      setSaved(true)
      setTimeout(() => setSaved(false), 2500)
    } catch {
      setError('Falha ao salvar. Tente novamente.')
    } finally {
      setSaving(false)
    }
  }

  const isDirty =
    draft.name !== court.name ||
    draft.description !== court.description ||
    draft.pricePerHour !== court.pricePerHour ||
    draft.maxPlayers !== court.maxPlayers ||
    draft.showCapacity !== court.showCapacity ||
    draft.courtWhatsapp.trim() !== (court.courtWhatsapp ?? '') ||
    JSON.stringify(draft.images) !== JSON.stringify(initialImages) ||
    JSON.stringify(draft.sports) !== JSON.stringify(court.sports ?? [])

  return (
    <div className="bg-surface-container-lowest rounded-2xl border border-outline-variant/30 overflow-hidden sun-shadow">
      {/* Preview carrossel */}
      <div className="relative h-44 bg-secondary-container overflow-hidden">
        <ImageCarouselPreview images={draft.images} name={draft.name} />
        <div className="absolute top-2 right-2 bg-black/40 backdrop-blur-sm text-white rounded-lg px-2 py-0.5 font-headline text-[9px] font-bold uppercase flex items-center gap-1">
          <Eye className="w-3 h-3" /> Preview
        </div>
        {draft.images.length > 1 && (
          <div className="absolute top-2 left-2 bg-primary text-white rounded-full px-2 py-0.5 font-headline text-[9px] font-bold">
            {draft.images.length} fotos
          </div>
        )}
      </div>

      <div className="p-5 space-y-5">
        {/* Nome */}
        <div>
          <label className="font-headline text-[10px] text-on-surface-variant uppercase font-bold tracking-widest mb-1.5 block">
            Nome da Quadra
          </label>
          <input
            value={draft.name}
            onChange={(e) => setDraft((d) => ({ ...d, name: e.target.value }))}
            className="w-full bg-surface-container border border-outline-variant/40 rounded-xl px-3 py-2.5 font-headline text-sm text-on-surface focus:outline-none focus:border-primary/50 transition-colors"
          />
        </div>

        {/* Descrição */}
        <div>
          <label className="font-headline text-[10px] text-on-surface-variant uppercase font-bold tracking-widest mb-1.5 flex items-center gap-1.5">
            <FileText className="w-3 h-3" /> Descrição
          </label>
          <textarea
            value={draft.description}
            onChange={(e) => setDraft((d) => ({ ...d, description: e.target.value }))}
            rows={3}
            className="w-full bg-surface-container border border-outline-variant/40 rounded-xl px-3 py-2.5 font-headline text-sm text-on-surface focus:outline-none focus:border-primary/50 transition-colors resize-none"
          />
        </div>

        {/* Preço */}
        <div>
          <label className="font-headline text-[10px] text-on-surface-variant uppercase font-bold tracking-widest mb-1.5 flex items-center gap-1.5">
            <DollarSign className="w-3 h-3" /> Preço por Hora (R$)
          </label>
          <input
            type="number"
            min={0}
            step={0.01}
            value={draft.pricePerHour}
            onChange={(e) => setDraft((d) => ({ ...d, pricePerHour: parseFloat(e.target.value) || 0 }))}
            className="w-full bg-surface-container border border-outline-variant/40 rounded-xl px-3 py-2.5 font-headline text-sm text-on-surface focus:outline-none focus:border-primary/50 transition-colors"
          />
          <p className="font-headline text-[10px] text-primary mt-1">
            {draft.pricePerHour > 0 ? `${formatCurrency(draft.pricePerHour)}/h` : 'Gratuito'}
          </p>
        </div>

        {/* Capacidade */}
        <div className="space-y-2">
          <label className="font-headline text-[10px] text-on-surface-variant uppercase font-bold tracking-widest flex items-center gap-1.5">
            Capacidade (jogadores)
          </label>
          <select
            value={draft.maxPlayers}
            onChange={(e) => setDraft((d) => ({ ...d, maxPlayers: Number(e.target.value) }))}
            className="w-full bg-surface-container border border-outline-variant/40 rounded-xl px-3 py-2.5 font-headline text-sm text-on-surface focus:outline-none focus:border-primary/50 transition-colors"
          >
            {Array.from({ length: 12 }, (_, i) => i + 1).map(n => (
              <option key={n} value={n}>Até {n} {n === 1 ? 'jogador' : 'jogadores'}</option>
            ))}
          </select>
          <button
            type="button"
            onClick={() => setDraft((d) => ({ ...d, showCapacity: !d.showCapacity }))}
            className="flex items-center justify-between w-full bg-surface-container border border-outline-variant/40 rounded-xl px-3 py-2.5 transition-colors hover:border-primary/30"
          >
            <span className="font-headline text-xs text-on-surface-variant">
              Exibir capacidade na página principal
            </span>
            <span className={`relative w-9 h-5 rounded-full transition-colors flex-shrink-0 ${draft.showCapacity ? 'bg-primary' : 'bg-outline-variant/50'}`}>
              <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-all ${draft.showCapacity ? 'left-[17px]' : 'left-0.5'}`} />
            </span>
          </button>
        </div>

        {/* WhatsApp da quadra */}
        <div>
          <label className="font-headline text-[10px] text-on-surface-variant uppercase font-bold tracking-widest mb-1.5 flex items-center gap-1.5">
            <MessageCircle className="w-3 h-3" /> WhatsApp desta Quadra (opcional)
          </label>
          <input
            type="tel"
            value={draft.courtWhatsapp}
            onChange={(e) => setDraft((d) => ({ ...d, courtWhatsapp: e.target.value }))}
            placeholder="Ex: 5527999999999"
            className="w-full bg-surface-container border border-outline-variant/40 rounded-xl px-3 py-2.5 font-headline text-sm text-on-surface focus:outline-none focus:border-primary/50 transition-colors placeholder:text-on-surface-variant/40"
          />
          <p className="font-headline text-[10px] text-on-surface-variant mt-1">
            Se preenchido, substitui o WhatsApp global no botão desta quadra. Deixe em branco para usar o número padrão de Contato.
          </p>
        </div>

        {/* Esportes */}
        <div>
          <label className="font-headline text-[10px] text-on-surface-variant uppercase font-bold tracking-widest mb-1.5 block">
            Esportes disponíveis
          </label>
          <div className="flex gap-2 mb-2">
            <input
              value={sportInput}
              onChange={(e) => setSportInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault()
                  const s = sportInput.trim()
                  if (s && !draft.sports.includes(s)) {
                    setDraft((d) => ({ ...d, sports: [...d.sports, s] }))
                  }
                  setSportInput('')
                }
              }}
              placeholder="Ex: Vôlei, Beach Tennis..."
              className="flex-1 bg-surface-container border border-outline-variant/40 rounded-xl px-3 py-2 font-headline text-xs text-on-surface focus:outline-none focus:border-primary/50 transition-colors placeholder:text-on-surface-variant/40"
            />
            <button
              type="button"
              onClick={() => {
                const s = sportInput.trim()
                if (s && !draft.sports.includes(s)) {
                  setDraft((d) => ({ ...d, sports: [...d.sports, s] }))
                }
                setSportInput('')
              }}
              disabled={!sportInput.trim()}
              className="bg-primary/10 text-primary hover:bg-primary/20 disabled:opacity-40 px-3 py-2 rounded-xl font-headline text-[10px] font-bold uppercase transition-all flex items-center gap-1"
            >
              <Plus className="w-3.5 h-3.5" /> Add
            </button>
          </div>
          {draft.sports.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {draft.sports.map((s) => (
                <span key={s} className="flex items-center gap-1 bg-primary/10 text-primary border border-primary/20 px-2.5 py-1 rounded-full font-headline text-xs font-bold">
                  {s}
                  <button
                    type="button"
                    onClick={() => setDraft((d) => ({ ...d, sports: d.sports.filter((x) => x !== s) }))}
                    className="hover:text-red-500 transition-colors ml-0.5"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </span>
              ))}
            </div>
          )}
          {draft.sports.length === 0 && (
            <p className="font-headline text-[10px] text-on-surface-variant/60">Nenhum esporte — o cliente não verá a seleção.</p>
          )}
        </div>

        {/* Imagens */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="font-headline text-[10px] text-on-surface-variant uppercase font-bold tracking-widest flex items-center gap-1.5">
              <ImageIcon className="w-3 h-3" /> Imagens ({draft.images.length})
            </label>
            <div className="flex gap-1">
              <button
                type="button"
                onClick={() => setAddMode('upload')}
                className={`px-2 py-1 rounded-lg font-headline text-[9px] font-bold uppercase transition-all flex items-center gap-1 ${addMode === 'upload' ? 'bg-primary text-white' : 'bg-surface-container text-on-surface-variant hover:bg-outline-variant/30'}`}
              >
                <Upload className="w-3 h-3" /> Upload
              </button>
              <button
                type="button"
                onClick={() => setAddMode('url')}
                className={`px-2 py-1 rounded-lg font-headline text-[9px] font-bold uppercase transition-all flex items-center gap-1 ${addMode === 'url' ? 'bg-primary text-white' : 'bg-surface-container text-on-surface-variant hover:bg-outline-variant/30'}`}
              >
                <Link2 className="w-3 h-3" /> URL
              </button>
            </div>
          </div>

          {/* Área de upload */}
          {addMode === 'upload' && (
            <div
              onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
              onDragLeave={() => setDragOver(false)}
              onDrop={handleDrop}
              onClick={() => !uploading && fileInputRef.current?.click()}
              className={`border-2 border-dashed rounded-xl p-4 text-center cursor-pointer transition-all mb-3 ${
                dragOver
                  ? 'border-primary bg-primary/5'
                  : 'border-outline-variant/50 hover:border-primary/40 hover:bg-surface-container/50'
              } ${uploading ? 'opacity-60 cursor-not-allowed' : ''}`}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                multiple
                className="hidden"
                onChange={handleFileInput}
              />
              {uploading ? (
                <div className="flex flex-col items-center gap-1.5">
                  <Loader2 className="w-6 h-6 text-primary animate-spin" />
                  <span className="font-headline text-xs text-on-surface-variant">Enviando...</span>
                </div>
              ) : (
                <div className="flex flex-col items-center gap-1.5">
                  <Upload className="w-6 h-6 text-primary/50" />
                  <span className="font-headline text-xs font-bold text-on-surface">Clique ou arraste fotos aqui</span>
                  <span className="font-headline text-[10px] text-on-surface-variant">JPEG, PNG, WebP — máx. 5MB cada</span>
                </div>
              )}
            </div>
          )}

          {/* Input de URL */}
          {addMode === 'url' && (
            <div className="flex gap-2 mb-3">
              <input
                type="url"
                value={urlInput}
                onChange={(e) => { setUrlInput(e.target.value); setError('') }}
                onKeyDown={(e) => e.key === 'Enter' && addImageUrl(urlInput)}
                placeholder="Cole a URL da imagem..."
                className="flex-1 bg-surface-container border border-outline-variant/40 rounded-xl px-3 py-2 font-headline text-xs text-on-surface focus:outline-none focus:border-primary/50 transition-colors placeholder:text-on-surface-variant/40"
              />
              <button
                type="button"
                onClick={() => addImageUrl(urlInput)}
                disabled={!urlInput.trim()}
                className="bg-primary/10 text-primary hover:bg-primary/20 disabled:opacity-40 px-3 py-2 rounded-xl font-headline text-[10px] font-bold uppercase transition-all flex items-center gap-1"
              >
                <Plus className="w-3.5 h-3.5" /> Add
              </button>
            </div>
          )}

          {error && <p className="font-headline text-[10px] text-red-500 mb-2">{error}</p>}

          {/* Lista de imagens adicionadas */}
          {draft.images.length > 0 && (
            <div className="space-y-2">
              {draft.images.map((url, idx) => (
                <div key={idx} className="flex items-center gap-2 bg-surface-container rounded-xl p-2 border border-outline-variant/30">
                  <div className="relative w-12 h-9 rounded-lg overflow-hidden flex-shrink-0 bg-secondary-container">
                    <Image src={url} alt={`Foto ${idx + 1}`} fill className="object-cover" />
                  </div>
                  <span className="flex-1 font-headline text-[10px] text-on-surface-variant truncate min-w-0">{url}</span>
                  <div className="flex items-center gap-1 flex-shrink-0">
                    {idx > 0 && (
                      <button type="button" onClick={() => moveImage(idx, idx - 1)} className="p-1 hover:bg-surface-container-high rounded-lg transition-colors" title="Mover para cima na ordem">
                        <ChevronLeft className="w-3.5 h-3.5 text-on-surface-variant rotate-90" />
                      </button>
                    )}
                    {idx < draft.images.length - 1 && (
                      <button type="button" onClick={() => moveImage(idx, idx + 1)} className="p-1 hover:bg-surface-container-high rounded-lg transition-colors" title="Mover para baixo na ordem">
                        <ChevronRight className="w-3.5 h-3.5 text-on-surface-variant rotate-90" />
                      </button>
                    )}
                    <button type="button" onClick={() => removeImage(idx)} className="p-1 hover:bg-red-50 rounded-lg transition-colors group">
                      <Trash2 className="w-3.5 h-3.5 text-on-surface-variant group-hover:text-red-500" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Botões de ação */}
        <div className="flex items-center gap-3 pt-1">
          <button
            type="button"
            onClick={handleSave}
            disabled={saving || !isDirty}
            className="flex-1 bg-primary text-white hover:bg-primary/90 disabled:opacity-40 px-4 py-2.5 rounded-xl font-headline text-[10px] font-bold uppercase transition-all flex items-center justify-center gap-2"
          >
            {saving ? (
              <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Salvando...</>
            ) : saved ? (
              <>✓ Salvo!</>
            ) : (
              <><Save className="w-3.5 h-3.5" /> Salvar Alterações</>
            )}
          </button>
          {isDirty && (
            <button
              type="button"
              onClick={() => setDraft({ name: court.name, description: court.description, pricePerHour: court.pricePerHour, maxPlayers: Math.min(Math.max(court.maxPlayers, 1), 12), showCapacity: court.showCapacity, courtWhatsapp: court.courtWhatsapp ?? '', images: initialImages, sports: court.sports ?? [] })}
              className="p-2.5 bg-surface-container hover:bg-outline-variant/30 rounded-xl transition-all"
              title="Descartar alterações"
            >
              <X className="w-4 h-4 text-on-surface-variant" />
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

// ─── Página principal ──────────────────────────────────────────────────────────

export function CourtSettingsClient({ initialCourts, hideTitle }: Props) {
  const [courts, setCourts] = useState(initialCourts)
  const { socket } = useSocket()

  // Atualiza se outro admin salvar uma quadra
  useEffect(() => {
    if (!socket) return
    const handler = (updated: Court) => {
      setCourts((prev) => prev.map((c) => (c.id === updated.id ? { ...c, ...updated } : c)))
    }
    socket.on('court:updated', handler)
    return () => { socket.off('court:updated', handler) }
  }, [socket])

  const handleSaved = (updated: Court) => {
    setCourts((prev) => prev.map((c) => (c.id === updated.id ? updated : c)))
  }

  return (
    <div className="space-y-8">
      {!hideTitle && (
        <div>
          <h1 className="font-headline text-2xl text-on-surface font-bold">Configurações</h1>
          <p className="font-headline text-xs text-on-surface-variant uppercase tracking-widest mt-1">
            Gerencie imagens, preços e descrições das quadras
          </p>
        </div>
      )}

      <section>
        <div className="flex items-center gap-2 mb-4">
          <ImageIcon className="w-4 h-4 text-primary" />
          <h2 className="font-headline text-base font-bold text-on-surface">Quadras</h2>
          <span className="bg-primary/10 text-primary font-headline text-[10px] font-bold px-2 py-0.5 rounded-full uppercase">
            {courts.length}
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {courts.map((court) => (
            <CourtEditor key={court.id} court={court} onSaved={handleSaved} />
          ))}
        </div>
      </section>
    </div>
  )
}
