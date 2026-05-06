export function playNotification() {
  if (typeof window === 'undefined') return
  try {
    const ctx = new (window.AudioContext ||
      (window as any).webkitAudioContext)()

    function playTone(
      freq: number,
      start: number,
      duration: number,
      gain: number,
    ) {
      const osc = ctx.createOscillator()
      const gainNode = ctx.createGain()

      osc.connect(gainNode)
      gainNode.connect(ctx.destination)

      osc.frequency.value = freq
      osc.type = 'sine'

      gainNode.gain.setValueAtTime(0, ctx.currentTime + start)
      gainNode.gain.linearRampToValueAtTime(gain, ctx.currentTime + start + 0.01)
      gainNode.gain.linearRampToValueAtTime(0, ctx.currentTime + start + duration)

      osc.start(ctx.currentTime + start)
      osc.stop(ctx.currentTime + start + duration + 0.01)
    }

    playTone(880, 0, 0.15, 0.3)
    playTone(1100, 0.18, 0.2, 0.3)
  } catch {
    // Web Audio API no disponible — silencio
  }
}
