'use client'

import { useState, useEffect } from 'react'
import { CreditCard, Key, Webhook, Eye, EyeOff, Save, Loader2, X, Copy, Check, ExternalLink } from 'lucide-react'

interface PaymentSettings {
  mpAccessToken: string
  mpPublicKey: string
  mpWebhookSecret: string
  mpNotificationUrl: string
}

const EMPTY: PaymentSettings = { mpAccessToken: '', mpPublicKey: '', mpWebhookSecret: '', mpNotificationUrl: '' }

const inputCls =
  'w-full bg-surface-container border border-outline-variant/40 rounded-xl px-3 py-2.5 font-headline text-sm text-on-surface focus:outline-none focus:border-primary/50 transition-colors placeholder:text-on-surface-variant/40'

function SecretField({
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
      <label className="font-headline text-[10px] text-on-surface-variant uppercase font-bold tracking-widest mb-1.5 flex items-center gap-1.5">
        <Key className="w-3 h-3" /> {label}
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

function CopyableUrl({ url }: { url: string }) {
  const [copied, setCopied] = useState(false)

  const copy = () => {
    navigator.clipboard.writeText(url).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }

  return (
    <div className="flex items-center gap-2 bg-surface-container border border-primary/20 rounded-xl px-3 py-2.5">
      <code className="flex-1 font-mono text-[11px] text-primary break-all">{url}</code>
      <div className="flex items-center gap-1 flex-shrink-0">
        <button
          type="button"
          onClick={copy}
          className="p-1.5 hover:bg-primary/10 rounded-lg transition-colors"
          title="Copiar URL"
        >
          {copied ? <Check className="w-3.5 h-3.5 text-green-600" /> : <Copy className="w-3.5 h-3.5 text-primary" />}
        </button>
        <a
          href="https://www.mercadopago.com.br/developers/panel/app"
          target="_blank"
          rel="noopener noreferrer"
          className="p-1.5 hover:bg-primary/10 rounded-lg transition-colors"
          title="Abrir painel MP"
        >
          <ExternalLink className="w-3.5 h-3.5 text-primary" />
        </a>
      </div>
    </div>
  )
}

export function PaymentSettingsClient() {
  const [draft, setDraft] = useState<PaymentSettings>(EMPTY)
  const [committed, setCommitted] = useState<PaymentSettings>(EMPTY)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState('')

  const webhookUrl =
    typeof window !== 'undefined'
      ? `${window.location.origin}/api/payments/webhook`
      : '/api/payments/webhook'

  useEffect(() => {
    fetch('/api/admin/settings/payment')
      .then((r) => r.json())
      .then((data) => {
        const s = {
        mpAccessToken:    data.mpAccessToken    ?? '',
        mpPublicKey:      data.mpPublicKey      ?? '',
        mpWebhookSecret:  data.mpWebhookSecret  ?? '',
        mpNotificationUrl: data.mpNotificationUrl ?? '',
      }
        setDraft(s)
        setCommitted(s)
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  const isDirty = JSON.stringify(draft) !== JSON.stringify(committed)
  const set = (key: keyof PaymentSettings) => (v: string) => setDraft((d) => ({ ...d, [key]: v }))

  const handleSave = async () => {
    setSaving(true)
    setError('')
    try {
      const res = await fetch('/api/admin/settings/payment', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(draft),
      })
      if (!res.ok) throw new Error('Erro ao salvar')
      setCommitted({ ...draft })
      setSaved(true)
      setTimeout(() => setSaved(false), 2500)
    } catch {
      setError('Falha ao salvar. Tente novamente.')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    )
  }

  return (
    <div className="max-w-lg space-y-4">

      {/* Webhook URL */}
      <div className="bg-surface-container-lowest rounded-2xl border border-outline-variant/30 p-5 sun-shadow">
        <div className="flex items-center gap-2 mb-3">
          <Webhook className="w-4 h-4 text-primary" />
          <h3 className="font-headline text-sm text-on-surface font-bold">URL do Webhook</h3>
        </div>
        <p className="font-headline text-[11px] text-on-surface-variant mb-3 leading-relaxed">
          Configure esta URL no painel do Mercado Pago em{' '}
          <strong>Seu negócio → Notificações → Webhooks</strong> para receber
          confirmações de pagamento automaticamente.
        </p>
        <CopyableUrl url={webhookUrl} />
      </div>

      {/* Chaves da API */}
      <div className="bg-surface-container-lowest rounded-2xl border border-outline-variant/30 overflow-hidden sun-shadow">
        <div className="flex items-center gap-2 px-5 py-4 border-b border-outline-variant/20">
          <CreditCard className="w-4 h-4 text-primary" />
          <h3 className="font-headline text-sm text-on-surface font-bold">Chaves da API</h3>
          <span className="ml-auto font-headline text-[9px] text-on-surface-variant bg-surface-container px-2 py-0.5 rounded-full uppercase font-bold">
            Mercado Pago
          </span>
        </div>

        <div className="p-5 space-y-4">
          <p className="font-headline text-[11px] text-on-surface-variant leading-relaxed">
            Obtenha suas chaves em{' '}
            <a
              href="https://www.mercadopago.com.br/developers/panel/app"
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary underline underline-offset-2"
            >
              mercadopago.com.br/developers
            </a>
            . Use as chaves de <strong>produção</strong> para receber pagamentos reais.
          </p>

          <SecretField
            label="Access Token (Privado)"
            hint="Começa com APP_USR-... — nunca compartilhe esta chave."
            value={draft.mpAccessToken}
            onChange={set('mpAccessToken')}
            placeholder="APP_USR-..."
          />

          <SecretField
            label="Public Key (Pública)"
            hint="Usada no navegador para tokenizar cartões. Começa com APP_USR-..."
            value={draft.mpPublicKey}
            onChange={set('mpPublicKey')}
            placeholder="APP_USR-..."
          />

          <SecretField
            label="Webhook Secret"
            hint="Chave para validar a autenticidade das notificações recebidas."
            value={draft.mpWebhookSecret}
            onChange={set('mpWebhookSecret')}
            placeholder="abc123..."
          />

          <div>
            <label className="font-headline text-[10px] text-on-surface-variant uppercase font-bold tracking-widest mb-1.5 flex items-center gap-1.5">
              <Webhook className="w-3 h-3" /> URL de Notificação (notification_url)
            </label>
            <input
              type="url"
              value={draft.mpNotificationUrl}
              onChange={(e) => setDraft((d) => ({ ...d, mpNotificationUrl: e.target.value.trim() }))}
              placeholder="https://seudominio.com.br/api/payments/webhook"
              className={inputCls}
            />
            <p className="font-headline text-[10px] text-on-surface-variant mt-1">
              URL enviada ao MP em cada pagamento PIX. Deixe em branco para usar o webhook configurado no painel do MP.
            </p>
          </div>

          {error && (
            <p className="font-headline text-[10px] text-red-500 bg-red-50 border border-red-200 rounded-xl px-3 py-2">
              {error}
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
              ) : saved ? (
                <>✓ Salvo!</>
              ) : (
                <><Save className="w-3.5 h-3.5" /> Salvar Chaves</>
              )}
            </button>
            {isDirty && (
              <button
                type="button"
                onClick={() => setDraft({ ...committed })}
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
