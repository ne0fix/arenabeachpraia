'use client'

import { useState, useTransition } from 'react'
import Image from 'next/image'
import { Button } from '@/views/components/ui/Button'
import { User, Lock, EyeOff, Eye, ArrowRight, ShieldCheck } from 'lucide-react'
import { motion } from 'motion/react'
import { adminLoginAction } from './actions'

export default function AdminLoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPwd, setShowPwd] = useState(false)
  const [error, setError] = useState('')
  const [isPending, startTransition] = useTransition()

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    startTransition(async () => {
      const err = await adminLoginAction(email, password)
      if (err) setError(err)
    })
  }

  return (
    <div className="min-h-dvh flex flex-col items-center justify-center p-4 bg-surface">
      <motion.main
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-[360px] bg-surface-container-lowest rounded-2xl p-6 shadow-sm border border-outline-variant/30"
      >
        <div className="flex flex-col items-center mb-6">
          <div className="w-16 h-16 mb-3 rounded-full bg-primary-container flex items-center justify-center overflow-hidden">
            <Image alt="Logo" src="/logo.svg" width={64} height={64} className="w-full h-full object-cover" />
          </div>
          <h1 className="font-headline text-xl text-primary font-bold">Arena Beach Serra</h1>
          <div className="flex items-center gap-1.5 mt-1.5 bg-primary/8 border border-primary/15 rounded-full px-3 py-1">
            <ShieldCheck className="w-3 h-3 text-primary" />
            <span className="font-headline text-[9px] font-bold text-primary uppercase tracking-widest">Acesso Administrativo</span>
          </div>
        </div>

        <form className="space-y-4" onSubmit={handleLogin}>
          <div className="relative group">
            <label className="absolute -top-2 left-3 px-1 bg-surface-container-lowest font-headline text-[10px] font-bold text-outline">
              E-mail
            </label>
            <div className="flex items-center border border-outline-variant rounded-xl px-3 py-2.5 focus-within:border-primary transition-all">
              <User className="text-outline mr-2 w-4 h-4" />
              <input
                className="w-full bg-transparent border-none p-0 focus:ring-0 text-on-surface font-sans text-sm outline-none"
                placeholder="admin@arena.com"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
              />
            </div>
          </div>

          <div className="relative group">
            <label className="absolute -top-2 left-3 px-1 bg-surface-container-lowest font-headline text-[10px] font-bold text-outline">
              Senha
            </label>
            <div className="flex items-center border border-outline-variant rounded-xl px-3 py-2.5 focus-within:border-primary transition-all">
              <Lock className="text-outline mr-2 w-4 h-4" />
              <input
                className="w-full bg-transparent border-none p-0 focus:ring-0 text-on-surface font-sans text-sm outline-none"
                placeholder="••••••••"
                type={showPwd ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete="current-password"
              />
              <button type="button" onClick={() => setShowPwd(!showPwd)} className="text-outline ml-1">
                {showPwd ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {error && (
            <p className="text-red-600 font-headline text-[10px] font-bold bg-red-50 rounded-lg px-3 py-2">
              {error}
            </p>
          )}

          <Button
            type="submit"
            className="w-full h-12 rounded-xl text-sm"
            rightIcon={<ArrowRight className="w-4 h-4" />}
            isLoading={isPending}
          >
            Entrar no Painel
          </Button>
        </form>
      </motion.main>
    </div>
  )
}
