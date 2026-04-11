import { BarChart2 } from 'lucide-react'

export default function ConversionesPage() {
  return (
    <div className="flex-1 flex items-center justify-center bg-gray-50">
      <div className="text-center">
        <div className="w-16 h-16 rounded-2xl bg-gray-100 flex items-center
          justify-center mx-auto mb-4">
          <BarChart2 className="w-8 h-8 text-gray-400" strokeWidth={1.5} />
        </div>
        <h3 className="text-sm font-medium text-gray-900 mb-1">Conversiones</h3>
        <p className="text-xs text-gray-500">
          Próximamente — aquí verás las conversaciones que convirtieron en ventas
        </p>
        <span className="mt-3 inline-block text-xs bg-violet-100 text-violet-600
          px-3 py-1 rounded-full">
          En desarrollo
        </span>
      </div>
    </div>
  )
}
