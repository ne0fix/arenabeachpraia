'use client'

import { Suspense, useState } from 'react'
import Script from 'next/script'
import { QrCode, CreditCard, Lock, Copy, Check, Smartphone, ScanLine, BadgeCheck, ChevronRight, AlertTriangle, XCircle, Loader2 } from 'lucide-react'
import { motion, AnimatePresence } from 'motion/react'
import Image from 'next/image'
import { Button } from '@/views/components/ui/Button'
import { usePaymentViewModel } from '@/viewmodels/client/usePaymentViewModel'

const PIX_STEPS = [
  { icon: Smartphone, label: 'Abra o app', desc: 'do seu banco' },
  { icon: ScanLine,   label: 'Escaneie',   desc: 'o QR Code' },
  { icon: BadgeCheck, label: 'Confirme',   desc: 'o pagamento' },
]

function CancelButton({
  confirm,
  cancelling,
  onCancel,
  onDismiss,
}: {
  confirm: boolean
  cancelling: boolean
  onCancel: () => void
  onDismiss: () => void
}) {
  if (cancelling) {
    return (
      <div className="flex items-center justify-center gap-2 py-3">
        <Loader2 className="w-4 h-4 animate-spin text-red-500" />
        <span className="font-headline text-sm text-red-500 font-bold">Cancelando pedido...</span>
      </div>
    )
  }

  if (confirm) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-2xl p-4 flex flex-col gap-3">
        <p className="font-headline text-sm text-red-700 font-bold text-center">
          Tem certeza que deseja cancelar?
        </p>
        <p className="font-headline text-[11px] text-red-600 text-center leading-relaxed">
          O pedido será cancelado e você voltará para a página inicial.
        </p>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={onDismiss}
            className="flex-1 py-2.5 rounded-xl border border-outline-variant/40 font-headline text-xs font-bold text-on-surface-variant hover:bg-surface-container transition-all"
          >
            Voltar
          </button>
          <button
            type="button"
            onClick={onCancel}
            className="flex-1 py-2.5 rounded-xl bg-red-600 text-white font-headline text-xs font-bold hover:bg-red-700 transition-all"
          >
            Sim, cancelar
          </button>
        </div>
      </div>
    )
  }

  return (
    <button
      type="button"
      onClick={onCancel}
      className="w-full flex items-center justify-center gap-2 py-3 rounded-2xl border border-red-200 text-red-500 font-headline text-sm font-bold hover:bg-red-50 active:scale-[0.98] transition-all"
    >
      <XCircle className="w-4 h-4" />
      Cancelar pedido
    </button>
  )
}

function PaymentContent() {
  const vm = usePaymentViewModel()
  const isDev = process.env.NODE_ENV === 'development'
  const [confirmCancel, setConfirmCancel] = useState(false)

  const handleCancel = async () => {
    if (!confirmCancel) { setConfirmCancel(true); return }
    setConfirmCancel(false)
    await vm.cancelOrder()
  }

  return (
    <main className="px-4 pb-28 md:pb-12 max-w-lg mx-auto">
      <Script src="https://sdk.mercadopago.com/js/v2" strategy="afterInteractive" />

      {/* Cabeçalho */}
      <section className="mb-4">
        <h2 className="font-headline text-2xl text-on-surface font-bold mb-1">Pagamento</h2>
        <p className="font-headline text-sm text-on-surface-variant">
          Escolha como deseja pagar sua reserva.
        </p>
      </section>

      {/* Aviso de garantia condicionada à confirmação */}
      <div className="mb-6 bg-amber-50 border border-amber-200 rounded-xl p-3 flex items-start gap-2">
        <AlertTriangle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
        <p className="font-headline text-[11px] text-amber-800 leading-relaxed">
          O horário só é <strong>garantido após a confirmação do pagamento</strong>. Se outro
          cliente concluir o pagamento antes, seu valor será estornado.
        </p>
      </div>

      {/* Tabs de método */}
      <div className="flex gap-2 mb-6 bg-surface-container rounded-2xl p-1.5 border border-outline-variant/20">
        {(['PIX', 'CREDIT_CARD'] as const).map((m) => (
          <button
            key={m}
            onClick={() => vm.setMethod(m)}
            className={`flex-1 py-3 px-4 rounded-xl flex items-center justify-center gap-2 transition-all font-headline text-sm font-bold ${
              vm.method === m
                ? 'bg-primary text-white shadow-md'
                : 'text-on-surface-variant hover:text-on-surface'
            }`}
          >
            {m === 'PIX' ? <QrCode className="w-4 h-4" /> : <CreditCard className="w-4 h-4" />}
            {m === 'PIX' ? 'Pix' : 'Cartão'}
          </button>
        ))}
      </div>

      <AnimatePresence mode="wait">
        {vm.method === 'PIX' ? (
          <motion.div key="pix"
            initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -12 }}
            transition={{ duration: 0.2 }}
          >
            {vm.pixQrCode ? (
              /* ── QR Code gerado ── */
              <div className="space-y-4">
                {/* Card principal QR */}
                <div className="bg-surface-container-lowest rounded-3xl border border-outline-variant/30 overflow-hidden shadow-sm">
                  {/* Header verde */}
                  <div className="bg-gradient-to-r from-green-600 to-emerald-500 px-5 py-4 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="bg-white/20 rounded-lg p-1.5">
                        <QrCode className="w-4 h-4 text-white" />
                      </div>
                      <span className="font-headline text-white font-bold text-sm">Pague com Pix</span>
                    </div>
                    <span className="font-headline text-[10px] text-white/80 bg-white/20 px-2.5 py-1 rounded-full font-bold uppercase tracking-wider">
                      Aprovação instantânea
                    </span>
                  </div>

                  {/* QR Code */}
                  <div className="px-6 pt-6 pb-4 flex flex-col items-center">
                    {vm.pixQrCodeBase64 ? (
                      <div className="bg-white p-4 rounded-2xl shadow-md border border-outline-variant/10 mb-5">
                        <Image
                          src={`data:image/png;base64,${vm.pixQrCodeBase64}`}
                          alt="QR Code Pix"
                          width={220}
                          height={220}
                          className="block"
                          priority
                        />
                      </div>
                    ) : (
                      <div className="bg-white p-4 rounded-2xl shadow-md border border-outline-variant/10 mb-5 w-[252px] h-[252px] flex items-center justify-center">
                        <QrCode className="w-24 h-24 text-outline/30" />
                      </div>
                    )}

                    {/* Passos como pagar */}
                    <div className="w-full flex items-center justify-between px-2 mb-5">
                      {PIX_STEPS.map((step, i) => (
                        <div key={i} className="flex items-center">
                          <div className="flex flex-col items-center gap-1">
                            <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center">
                              <step.icon className="w-4 h-4 text-primary" />
                            </div>
                            <span className="font-headline text-[9px] font-bold text-on-surface uppercase leading-tight text-center">{step.label}</span>
                            <span className="font-headline text-[9px] text-on-surface-variant text-center leading-tight">{step.desc}</span>
                          </div>
                          {i < PIX_STEPS.length - 1 && (
                            <ChevronRight className="w-3.5 h-3.5 text-outline/30 mx-1 mb-4 flex-shrink-0" />
                          )}
                        </div>
                      ))}
                    </div>

                    {/* Código copia e cola */}
                    <div className="w-full space-y-2">
                      <p className="font-headline text-[10px] text-on-surface-variant uppercase font-bold tracking-widest text-center">
                        Pix Copia e Cola
                      </p>
                      <div className="bg-surface-container rounded-xl px-3 py-2.5 border border-outline-variant/30">
                        <code className="font-headline text-[11px] text-on-surface-variant break-all line-clamp-2 leading-relaxed">
                          {vm.pixQrCode}
                        </code>
                      </div>
                      <button
                        onClick={vm.copyPix}
                        className={`w-full flex items-center justify-center gap-2 py-3.5 rounded-xl font-headline text-sm font-bold transition-all ${
                          vm.copied
                            ? 'bg-green-500 text-white'
                            : 'bg-primary text-white hover:bg-primary/90 active:scale-[0.98]'
                        }`}
                      >
                        {vm.copied
                          ? <><Check className="w-4 h-4" /> Código copiado!</>
                          : <><Copy className="w-4 h-4" /> Copiar código Pix</>
                        }
                      </button>
                    </div>
                  </div>

                  {/* Footer */}
                  <div className="border-t border-outline-variant/20 px-5 py-3 flex items-center justify-center gap-1.5">
                    <div className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
                    <span className="font-headline text-[11px] text-on-surface-variant font-bold">
                      Aguardando pagamento · válido por 30 min
                    </span>
                  </div>
                </div>

                {/* Botão cancelar pedido */}
                <CancelButton
                  confirm={confirmCancel}
                  cancelling={vm.cancelling}
                  onCancel={handleCancel}
                  onDismiss={() => setConfirmCancel(false)}
                />

                {isDev && (
                  <button
                    type="button"
                    onClick={vm.simulatePixPayment}
                    className="w-full py-2.5 rounded-xl border border-dashed border-outline-variant/40 font-headline text-[10px] text-on-surface-variant hover:bg-surface-container transition-all"
                  >
                    [DEV] Simular aprovação do pagamento
                  </button>
                )}
              </div>
            ) : (
              /* ── Antes de gerar QR ── */
              <div className="bg-surface-container-lowest rounded-3xl border border-outline-variant/30 overflow-hidden shadow-sm">
                <div className="bg-gradient-to-r from-green-600 to-emerald-500 px-5 py-4 flex items-center gap-2">
                  <div className="bg-white/20 rounded-lg p-1.5">
                    <QrCode className="w-4 h-4 text-white" />
                  </div>
                  <span className="font-headline text-white font-bold text-sm">Pagar com Pix</span>
                </div>

                <div className="p-6 space-y-5">
                  {/* Vantagens */}
                  <div className="grid grid-cols-3 gap-3">
                    {[
                      { icon: BadgeCheck, title: 'Seguro', desc: 'Criptografado pelo Banco Central' },
                      { icon: ScanLine, title: 'Rápido', desc: 'Aprovação em segundos' },
                      { icon: Smartphone, title: 'Fácil', desc: 'Qualquer app de banco' },
                    ].map(({ icon: Icon, title, desc }) => (
                      <div key={title} className="bg-surface-container rounded-xl p-3 text-center border border-outline-variant/20">
                        <Icon className="w-5 h-5 text-primary mx-auto mb-1.5" />
                        <p className="font-headline text-[10px] font-bold text-on-surface">{title}</p>
                        <p className="font-headline text-[9px] text-on-surface-variant leading-tight mt-0.5">{desc}</p>
                      </div>
                    ))}
                  </div>

                  <button
                    type="button"
                    onClick={() => vm.confirmPayment()}
                    disabled={vm.isPending}
                    className="w-full flex items-center justify-center gap-2 py-4 rounded-2xl bg-primary text-white font-headline text-sm font-bold hover:bg-primary/90 active:scale-[0.98] transition-all disabled:opacity-60 shadow-md shadow-primary/20"
                  >
                    {vm.isPending ? (
                      <><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Gerando QR Code...</>
                    ) : (
                      <><QrCode className="w-4 h-4" /> Gerar QR Code Pix</>
                    )}
                  </button>
                </div>
              </div>
            )}
          </motion.div>
        ) : (
          /* ── Cartão de crédito ── */
          <motion.div key="card"
            initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -12 }}
            transition={{ duration: 0.2 }}
            className="bg-surface-container-lowest rounded-3xl border border-outline-variant/30 overflow-hidden shadow-sm"
          >
            <div className="bg-gradient-to-r from-primary to-blue-600 px-5 py-4 flex items-center gap-2">
              <div className="bg-white/20 rounded-lg p-1.5">
                <CreditCard className="w-4 h-4 text-white" />
              </div>
              <span className="font-headline text-white font-bold text-sm">Cartão de Crédito</span>
            </div>

            <div className="p-5">
              <form
                className="space-y-4"
                onSubmit={(e) => {
                  e.preventDefault()
                  const fd = new FormData(e.currentTarget)
                  vm.confirmPayment({
                    cardNumber: fd.get('cardNumber') as string,
                    cardHolder: fd.get('cardHolder') as string,
                    expiry: fd.get('expiry') as string,
                    cvv: fd.get('cvv') as string,
                    cpf: fd.get('cpf') as string,
                  })
                }}
              >
                <div>
                  <label className="block font-headline text-[10px] text-on-surface-variant mb-1.5 font-bold uppercase tracking-widest">
                    Número do Cartão
                  </label>
                  <input
                    name="cardNumber"
                    required
                    placeholder="0000 0000 0000 0000"
                    maxLength={19}
                    className="w-full bg-surface-container border border-outline-variant/40 rounded-xl px-4 py-3.5 font-headline text-sm text-on-surface focus:outline-none focus:border-primary transition-all placeholder:text-outline/50"
                  />
                </div>
                <div>
                  <label className="block font-headline text-[10px] text-on-surface-variant mb-1.5 font-bold uppercase tracking-widest">
                    Nome no Cartão
                  </label>
                  <input
                    name="cardHolder"
                    required
                    placeholder="NOME COMO ESTÁ NO CARTÃO"
                    className="w-full bg-surface-container border border-outline-variant/40 rounded-xl px-4 py-3.5 font-headline text-sm text-on-surface focus:outline-none focus:border-primary transition-all placeholder:text-outline/50"
                  />
                </div>
                <div>
                  <label className="block font-headline text-[10px] text-on-surface-variant mb-1.5 font-bold uppercase tracking-widest">
                    CPF do Titular
                  </label>
                  <input
                    name="cpf"
                    required
                    inputMode="numeric"
                    placeholder="000.000.000-00"
                    maxLength={14}
                    className="w-full bg-surface-container border border-outline-variant/40 rounded-xl px-4 py-3.5 font-headline text-sm text-on-surface focus:outline-none focus:border-primary transition-all placeholder:text-outline/50"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block font-headline text-[10px] text-on-surface-variant mb-1.5 font-bold uppercase tracking-widest">
                      Validade
                    </label>
                    <input
                      name="expiry"
                      required
                      placeholder="MM/AA"
                      maxLength={5}
                      className="w-full bg-surface-container border border-outline-variant/40 rounded-xl px-4 py-3.5 font-headline text-sm text-on-surface focus:outline-none focus:border-primary transition-all placeholder:text-outline/50"
                    />
                  </div>
                  <div>
                    <label className="block font-headline text-[10px] text-on-surface-variant mb-1.5 font-bold uppercase tracking-widest">
                      CVV
                    </label>
                    <input
                      name="cvv"
                      required
                      placeholder="•••"
                      maxLength={4}
                      className="w-full bg-surface-container border border-outline-variant/40 rounded-xl px-4 py-3.5 font-headline text-sm text-on-surface focus:outline-none focus:border-primary transition-all placeholder:text-outline/50"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={vm.isPending}
                  className="w-full flex items-center justify-center gap-2 py-4 rounded-2xl bg-primary text-white font-headline text-sm font-bold hover:bg-primary/90 active:scale-[0.98] transition-all disabled:opacity-60 mt-2 shadow-md shadow-primary/20"
                >
                  {vm.isPending ? (
                    <><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Processando...</>
                  ) : (
                    <><Lock className="w-4 h-4" /> Finalizar Pagamento</>
                  )}
                </button>
              </form>

              {/* Botão cancelar pedido */}
              <div className="mt-3">
                <CancelButton
                  confirm={confirmCancel}
                  cancelling={vm.cancelling}
                  onCancel={handleCancel}
                  onDismiss={() => setConfirmCancel(false)}
                />
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Rodapé de segurança */}
      <div className="flex items-center justify-center gap-2 mt-5 text-on-surface-variant/60">
        <Lock className="w-3.5 h-3.5" />
        <span className="font-headline text-[10px] font-bold uppercase tracking-wider">
          Ambiente seguro · Criptografia SSL · Powered by Mercado Pago
        </span>
      </div>
    </main>
  )
}

export default function PaymentPage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center min-h-[60vh]">
        <span className="w-8 h-8 border-2 border-primary/20 border-t-primary rounded-full animate-spin" />
      </div>
    }>
      <PaymentContent />
    </Suspense>
  )
}
