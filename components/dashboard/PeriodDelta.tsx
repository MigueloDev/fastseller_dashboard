/** Variación contra la ventana anterior del mismo largo. null = sin base (Todo, o sin dato). */
export function PeriodDelta({
  current,
  previous,
}: {
  current: number | null
  previous: number | null
}) {
  if (current == null || previous == null) return null
  if (previous === 0) {
    if (current === 0) return null
    return (
      <span className="text-sm font-medium text-green-700">nuevo</span>
    )
  }
  const pct = ((current - previous) / Math.abs(previous)) * 100
  const up = pct > 0.05
  const down = pct < -0.05
  const text = `${up ? '+' : ''}${pct.toLocaleString('es-VE', {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  })}%`
  return (
    <span
      className={
        up
          ? 'text-sm font-medium text-green-700'
          : down
            ? 'text-sm font-medium text-red-600'
            : 'text-sm font-medium text-gray-500'
      }
    >
      {text}{' '}
      <span className="font-normal text-gray-400">vs período anterior</span>
    </span>
  )
}
