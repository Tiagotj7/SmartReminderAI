'use client'

import { useEffect, useState } from 'react'
import { Check, Download, ExternalLink, Smartphone, X } from 'lucide-react'

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

interface Props {
  onClose: () => void
}

export default function InstallGuide({ onClose }: Props) {
  const [installEvent, setInstallEvent] = useState<BeforeInstallPromptEvent | null>(null)
  const [installed, setInstalled] = useState(false)

  useEffect(() => {
    const handler = (event: Event) => {
      event.preventDefault()
      setInstallEvent(event as BeforeInstallPromptEvent)
    }
    window.addEventListener('beforeinstallprompt', handler)
    setInstalled(window.matchMedia('(display-mode: standalone)').matches)
    return () => window.removeEventListener('beforeinstallprompt', handler)
  }, [])

  const install = async () => {
    if (!installEvent) return
    await installEvent.prompt()
    const choice = await installEvent.userChoice
    if (choice.outcome === 'accepted') setInstalled(true)
    setInstallEvent(null)
  }

  return (
    <div className="modal-overlay" role="dialog" aria-modal="true" aria-label="Instalar aplicativo">
      <div className="modal-content max-h-[90dvh] overflow-y-auto">
        <div className="flex items-center justify-between border-b border-slate-800 px-6 py-5">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-500/15 text-indigo-400">
              <Smartphone className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">Instalar como app</h2>
              <p className="mt-1 text-xs text-slate-500">Acesse seus lembretes mais rapidamente.</p>
            </div>
          </div>
          <button type="button" onClick={onClose} className="btn-ghost" aria-label="Fechar guia">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="space-y-5 p-6">
          {installed && (
            <div className="flex items-center gap-2 rounded-xl bg-green-500/10 p-3 text-sm text-green-300">
              <Check className="h-4 w-4" /> O app já está instalado neste dispositivo.
            </div>
          )}

          {installEvent && !installed && (
            <button type="button" onClick={install} className="btn-primary w-full">
              <Download className="h-4 w-4" /> Instalar agora
            </button>
          )}

          <div className="space-y-4">
            <div>
              <h3 className="text-sm font-semibold text-white">Android — Chrome</h3>
              <p className="mt-1 text-sm leading-relaxed text-slate-400">
                Toque no menu <strong className="text-slate-200">⋮</strong> do navegador e escolha <strong className="text-slate-200">Instalar aplicativo</strong> ou <strong className="text-slate-200">Adicionar à tela inicial</strong>.
              </p>
            </div>
            <div>
              <h3 className="text-sm font-semibold text-white">iPhone — Safari</h3>
              <p className="mt-1 text-sm leading-relaxed text-slate-400">
                Toque em <strong className="text-slate-200">Compartilhar</strong>, depois em <strong className="text-slate-200">Adicionar à Tela de Início</strong> e confirme.
              </p>
            </div>
            <div>
              <h3 className="text-sm font-semibold text-white">Computador</h3>
              <p className="mt-1 text-sm leading-relaxed text-slate-400">
                No Chrome ou Edge, use o ícone de instalação na barra de endereço ou abra o menu e selecione <strong className="text-slate-200">Instalar Smart Reminder AI</strong>.
              </p>
            </div>
          </div>

          <p className="flex items-start gap-2 border-t border-slate-800 pt-4 text-xs leading-relaxed text-slate-500">
            <ExternalLink className="mt-0.5 h-3.5 w-3.5 shrink-0" />
            A opção de instalação depende do navegador e pode aparecer somente depois que o site for usado algumas vezes.
          </p>
        </div>
      </div>
    </div>
  )
}
