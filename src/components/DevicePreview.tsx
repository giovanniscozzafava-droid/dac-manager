import { useState } from 'react'
import { Smartphone, Tablet, Monitor, X } from 'lucide-react'

type Device = 'off' | 'mobile' | 'tablet' | 'desktop'

const SIZES: Record<Device, { w: number; h: number; label: string }> = {
  off: { w: 0, h: 0, label: '' },
  mobile: { w: 375, h: 812, label: 'iPhone (375×812)' },
  tablet: { w: 820, h: 1180, label: 'iPad (820×1180)' },
  desktop: { w: 1440, h: 900, label: 'Desktop (1440×900)' },
}

interface Props {
  children: React.ReactNode
  isAdmin: boolean
}

export function DevicePreview({ children, isAdmin }: Props) {
  const [device, setDevice] = useState<Device>('off')

  if (!isAdmin) return <>{children}</>

  if (device === 'off') {
    return (
      <div className="relative h-full">
        {children}
        <DeviceToggle device={device} onChange={setDevice} />
      </div>
    )
  }

  const size = SIZES[device]

  return (
    <div className="h-full flex flex-col bg-slate-950 overflow-hidden">
      <div className="px-4 py-2 border-b border-slate-800 flex items-center justify-between flex-shrink-0">
        <div className="text-xs text-slate-400 font-mono">{size.label}</div>
        <div className="flex items-center gap-2">
          <DeviceToggleInline device={device} onChange={setDevice} />
          <button onClick={() => setDevice('off')}
            className="p-1.5 rounded-lg bg-slate-800 text-slate-400 hover:text-white">
            <X size={14} />
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-auto p-6 flex items-start justify-center bg-slate-900">
        <div
          className="bg-slate-900 rounded-2xl border-4 border-slate-700 shadow-2xl overflow-hidden flex-shrink-0"
          style={{
            width: `${size.w}px`,
            height: `${Math.min(size.h, window.innerHeight - 120)}px`,
            maxWidth: '100%',
          }}
        >
          <div className="h-full overflow-auto">{children}</div>
        </div>
      </div>
    </div>
  )
}

function DeviceToggle({ device, onChange }: { device: Device; onChange: (d: Device) => void }) {
  return (
    <div className="fixed bottom-4 right-4 z-30 flex gap-1 bg-slate-950 border border-slate-700 rounded-xl p-1 shadow-2xl">
      <button onClick={() => onChange('mobile')}
        className={`p-2 rounded-lg ${device === 'mobile' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white'}`}
        title="Anteprima mobile">
        <Smartphone size={16} />
      </button>
      <button onClick={() => onChange('tablet')}
        className={`p-2 rounded-lg ${device === 'tablet' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white'}`}
        title="Anteprima tablet">
        <Tablet size={16} />
      </button>
      <button onClick={() => onChange('desktop')}
        className={`p-2 rounded-lg ${device === 'desktop' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white'}`}
        title="Anteprima desktop">
        <Monitor size={16} />
      </button>
    </div>
  )
}

function DeviceToggleInline({ device, onChange }: { device: Device; onChange: (d: Device) => void }) {
  return (
    <div className="flex gap-1 bg-slate-800 rounded-lg p-0.5">
      <button onClick={() => onChange('mobile')}
        className={`p-1.5 rounded ${device === 'mobile' ? 'bg-blue-600 text-white' : 'text-slate-400'}`}>
        <Smartphone size={14} />
      </button>
      <button onClick={() => onChange('tablet')}
        className={`p-1.5 rounded ${device === 'tablet' ? 'bg-blue-600 text-white' : 'text-slate-400'}`}>
        <Tablet size={14} />
      </button>
      <button onClick={() => onChange('desktop')}
        className={`p-1.5 rounded ${device === 'desktop' ? 'bg-blue-600 text-white' : 'text-slate-400'}`}>
        <Monitor size={14} />
      </button>
    </div>
  )
}
