import { Bell, BellOff, X, Smartphone } from 'lucide-react'
import type { PermissionStatus } from '../types'

interface Props {
  status: PermissionStatus
  onRequest: () => void
  onDismiss?: () => void
}

export default function PermissionBanner({ status, onRequest, onDismiss }: Props) {
  if (status === 'granted') return null

  return (
    <div
      className={`relative rounded-2xl border p-4 mb-5 sm:p-5 sm:mb-6 animate-fade-up ${
        status === 'denied'
          ? 'bg-red-950/20 border-red-800/40'
          : 'bg-gradient-to-r from-indigo-950/40 to-purple-950/30 border-indigo-800/40'
      }`}
    >
      {onDismiss && (
        <button onClick={onDismiss} className="btn-ghost absolute top-3 right-3 !p-1.5">
          <X className="w-3.5 h-3.5" />
        </button>
      )}

      <div className="flex items-start gap-3 sm:gap-4">
        <div className={`hidden w-11 h-11 rounded-xl items-center justify-center flex-shrink-0 sm:flex ${
          status === 'denied'
            ? 'bg-red-500/15 border border-red-500/20'
            : 'bg-indigo-500/15 border border-indigo-500/20'
        }`}>
          {status === 'denied'
            ? <BellOff className="w-5 h-5 text-red-400" />
            : <Bell className="w-5 h-5 text-indigo-400" />
          }
        </div>

        <div className="flex-1 min-w-0">
          {status === 'denied' ? (
            <>
              <h3 className="font-semibold text-red-300 text-sm mb-0.5">
                Notificações bloqueadas
              </h3>
              <p className="text-xs text-red-400/70 leading-relaxed">
                Vá em Configurações do navegador → Privacidade → Notificações e permita este site.
              </p>
            </>
          ) : (
            <>
              <h3 className="font-semibold text-white text-sm mb-0.5">
                Ative as notificações 🔔
              </h3>
              <p className="text-xs text-slate-400 leading-relaxed mb-3">
                Receba alertas enquanto o navegador mantiver o app ativo.
              </p>
              <div className="flex items-stretch gap-2 flex-col sm:flex-row sm:items-center sm:gap-3">
                <button onClick={onRequest} className="btn-primary !py-2 !px-3 !text-xs sm:!px-4">
                  <Bell className="w-3.5 h-3.5" />
                  Ativar Notificações
                </button>
                <span className="flex items-center gap-1.5 text-xs text-slate-500">
                  <Smartphone className="w-3.5 h-3.5" />
                  Funciona no celular
                </span>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
