interface Props {
  onLoginGoogle: () => void
  error: string | null
}

export function LoginSplash({ onLoginGoogle, error }: Props) {
  return (
    <div className="h-screen flex flex-col items-center justify-center noise-bg relative overflow-hidden"
      style={{ background: 'linear-gradient(135deg, #0a0f1e 0%, #0f1a2e 40%, #162038 100%)' }}>

      {/* Ambient glow */}
      <div className="absolute top-1/4 left-1/3 w-96 h-96 rounded-full opacity-10"
        style={{ background: 'radial-gradient(circle, #2e86c1 0%, transparent 70%)', filter: 'blur(80px)' }} />
      <div className="absolute bottom-1/3 right-1/4 w-80 h-80 rounded-full opacity-8"
        style={{ background: 'radial-gradient(circle, #1abc9c 0%, transparent 70%)', filter: 'blur(60px)' }} />

      <div className="relative z-10 text-center animate-fade-in">
        {/* Logo */}
        <div className="mb-6">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl mb-4"
            style={{ background: 'linear-gradient(135deg, #1a5276, #2e86c1)' }}>
            <span className="text-4xl">🏥</span>
          </div>
        </div>

        <h1 className="font-display text-3xl font-bold text-white mb-1 tracking-tight">
          DAC Manager
        </h1>
        <p className="text-dac-gray-400 text-sm mb-1">Palazzo della Salute</p>
        <p className="text-dac-gray-500 text-xs mb-10">
          LABORATORI DAC S.R.L. — Catenanuova (EN)
        </p>

        {/* Login button */}
        <button
          onClick={onLoginGoogle}
          className="group relative inline-flex items-center gap-3 px-8 py-3.5 rounded-xl font-semibold text-sm
            bg-white text-gray-800 hover:bg-gray-50
            shadow-lg shadow-black/20 hover:shadow-xl hover:shadow-black/30
            transition-all duration-200 hover:-translate-y-0.5 active:translate-y-0"
        >
          {/* Google icon */}
          <svg width="18" height="18" viewBox="0 0 24 24">
            <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/>
            <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
            <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
            <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
          </svg>
          Accedi con Google
        </button>

        {error && (
          <div className="mt-4 px-4 py-2 rounded-lg bg-dac-red/10 border border-dac-red/20 text-dac-red text-xs max-w-sm mx-auto">
            {error}
          </div>
        )}

        <p className="mt-8 text-dac-gray-500 text-[10px]">
          © 2026 Giovanni Scozzafava — Fuyue Digital Agency
        </p>
      </div>
    </div>
  )
}
