'use client'

import { useState } from 'react'
import { Eye, EyeOff, Lock, Save, Loader2, X } from 'lucide-react'

const inputCls =
  'w-full bg-surface-container border border-outline-variant/40 rounded-xl px-3 py-2.5 font-headline text-sm text-on-surface focus:outline-none focus:border-primary/50 transition-colors placeholder:text-on-surface-variant/40'

function PasswordField({
  label,
  hint,
  value,
  onChange,
  placeholder,
}: {
  label: string
  hint?: string
  value: string
  onChange: (v: string) => void
  placeholder?: string
}) {
  const [show, setShow] = useState(false)
  return (
    <div>
      <label className="font-headline text-[10px] text-on-surface-variant uppercase font-bold tracking-widest mb-1.5 block">
        {label}
      </label>
      <div className="relative">
        <input
          type={show ? 'text' : 'password'}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          autoComplete="off"
          className={inputCls + ' pr-10'}
        />
        <button
          type="button"
          onClick={() => setShow((s) => !s)}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-on-surface-variant hover:text-on-surface transition-colors"
        >
          {show ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
        </button>
      </div>
      {hint && <p className="font-headline text-[10px] text-on-surface-variant mt-1">{hint}</p>}
    </div>
  )
}

export function PasswordSettingsClient() {
  const [current, setCurrent] = useState('')
  const [next, setNext] = useState('')
  const [confirm, setConfirm] = useState('')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState('')

  const isDirty = current.length > 0 || next.length > 0 || confirm.length > 0

  const reset = () => {
    setCurrent('')
    setNext('')
    setConfirm('')
    setError('')
  }

  const handleSave = async () => {
    setError('')

    if (next !== confirm) {
      setError('A nova senha e a confirmação não coincidem.')
      return
    }
    if (next.length < 8) {
      setError('A nova senha deve ter ao menos 8 caracteres.')
      return
    }

    setSaving(true)
    try {
      const res = await fetch('/api/admin/settings/password', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currentPassword: current, newPassword: next }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error ?? 'Erro ao salvar. Tente novamente.')
        return
      }
      setSaved(true)
      reset()
      setTimeout(() => setSaved(false), 3000)
    } catch {
      setError('Falha ao salvar. Tente novamente.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="max-w-lg">
      <div className="bg-surface-container-lowest rounded-2xl border border-outline-variant/30 overflow-hidden sun-shadow">
        <div className="flex items-center gap-2 px-5 py-4 border-b border-outline-variant/20">
          <Lock className="w-4 h-4 text-primary" />
          <h3 className="font-headline text-sm text-on-surface font-bold">Alterar Senha</h3>
        </div>

        <div className="p-5 space-y-4">
          <p className="font-headline text-[11px] text-on-surface-variant leading-relaxed">
            Substitua a senha padrão por uma senha pessoal segura. Use ao menos 8 caracteres.
          </p>

          <PasswordField
            label="Senha atual"
            value={current}
            onChange={setCurrent}
            placeholder="Digite sua senha atual"
          />

          <PasswordField
            label="Nova senha"
            hint="Mínimo de 8 caracteres."
            value={next}
            onChange={setNext}
            placeholder="Digite a nova senha"
          />

          <PasswordField
            label="Confirmar nova senha"
            value={confirm}
            onChange={setConfirm}
            placeholder="Repita a nova senha"
          />

          {error && (
            <p className="font-headline text-[10px] text-red-500 bg-red-50 border border-red-200 rounded-xl px-3 py-2">
              {error}
            </p>
          )}

          {saved && (
            <p className="font-headline text-[10px] text-green-700 bg-green-50 border border-green-200 rounded-xl px-3 py-2">
              Senha alterada com sucesso!
            </p>
          )}

          <div className="flex items-center gap-3 pt-1">
            <button
              type="button"
              onClick={handleSave}
              disabled={saving || !isDirty}
              className="flex-1 bg-primary text-white hover:bg-primary/90 disabled:opacity-40 px-4 py-2.5 rounded-xl font-headline text-[10px] font-bold uppercase transition-all flex items-center justify-center gap-2"
            >
              {saving ? (
                <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Salvando...</>
              ) : (
                <><Save className="w-3.5 h-3.5" /> Salvar Senha</>
              )}
            </button>
            {isDirty && (
              <button
                type="button"
                onClick={reset}
                className="p-2.5 bg-surface-container hover:bg-outline-variant/30 rounded-xl transition-all"
                title="Descartar alterações"
              >
                <X className="w-4 h-4 text-on-surface-variant" />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
