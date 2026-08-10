/**
 * The interaction sounds — synthesised, no assets, one lazily created context.
 * Ported from `doc-shell.js`'s {SOUND} block, same vocabulary as the brief.
 *
 * Everything here is a no-op under `prefers-reduced-motion` and on the server:
 * "nothing moves and nothing sounds" is one rule, and the reduced-motion check
 * happens at call time rather than at import time so a viewer who changes the
 * setting mid-session is honoured without a reload.
 */

let actx: AudioContext | null = null

export function prefersReducedMotion(): boolean {
  if (typeof window === 'undefined' || !window.matchMedia) return true
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

function tone(from: number, to: number, dur: number, level: number, type: OscillatorType = 'sine') {
  if (prefersReducedMotion()) return
  try {
    actx ??= new AudioContext()
    const t = actx.currentTime
    const osc = actx.createOscillator()
    const gain = actx.createGain()
    osc.type = type
    osc.frequency.setValueAtTime(from, t)
    osc.frequency.exponentialRampToValueAtTime(to, t + dur)
    gain.gain.setValueAtTime(level, t)
    gain.gain.exponentialRampToValueAtTime(0.0001, t + dur + 0.01)
    osc.connect(gain)
    gain.connect(actx.destination)
    osc.start(t)
    osc.stop(t + dur + 0.02)
  } catch {
    // Audio is decoration; never let it break the page.
  }
}

export const sndOpen = () => tone(420, 690, 0.05, 0.05)
export const sndClose = () => tone(560, 330, 0.045, 0.035)
export const sndSwitch = () => {
  tone(520, 810, 0.045, 0.06)
  tone(300, 300, 0.02, 0.02, 'triangle')
}
export const sndTick = () => tone(700, 520, 0.03, 0.025)
