/**
 * The brief's own effects, ported from `shell.js`: the check blip, the confetti,
 * the completion fanfare, and the clipboard ladder.
 *
 * All of it is decoration and all of it is silent under `prefers-reduced-motion`
 * — "nothing moves and nothing sounds" is one rule, checked at call time so a
 * viewer who changes the setting mid-session is honoured without a reload.
 */

import { prefersReducedMotion } from './sound.ts'

/** Rising blip on check, falling on uncheck. A finished row recedes. */
export function playPop(checked: boolean) {
  if (prefersReducedMotion()) return
  try {
    const ctx = new AudioContext()
    const t = ctx.currentTime
    const gain = ctx.createGain()
    gain.connect(ctx.destination)
    const osc = ctx.createOscillator()
    osc.type = 'sine'
    if (checked) {
      osc.frequency.setValueAtTime(400, t)
      osc.frequency.exponentialRampToValueAtTime(800, t + 0.025)
      osc.frequency.exponentialRampToValueAtTime(600, t + 0.05)
      gain.gain.setValueAtTime(0.12, t)
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.06)
      osc.connect(gain)
      osc.start(t)
      osc.stop(t + 0.06)
    } else {
      osc.frequency.setValueAtTime(600, t)
      osc.frequency.exponentialRampToValueAtTime(350, t + 0.04)
      gain.gain.setValueAtTime(0.07, t)
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.05)
      osc.connect(gain)
      osc.start(t)
      osc.stop(t + 0.05)
    }
    setTimeout(() => void ctx.close(), 200)
  } catch {
    /* audio is decoration */
  }
}

/** A canvas burst at a point. Drawn rather than hand-authored as SVG, and torn
 *  down the frame the last bit dies. */
export function burst(x: number, y: number, colors = ['#FFE501', '#F0F0F0', '#99938A'], n = 26) {
  if (prefersReducedMotion()) return
  const cv = document.createElement('canvas')
  const dpr = devicePixelRatio || 1
  Object.assign(cv.style, {
    position: 'fixed', inset: '0', width: '100%', height: '100%',
    pointerEvents: 'none', zIndex: '60',
  })
  cv.width = innerWidth * dpr
  cv.height = innerHeight * dpr
  document.body.appendChild(cv)
  const c = cv.getContext('2d')
  if (!c) return cv.remove()
  c.scale(dpr, dpr)

  const bits = Array.from({ length: n }, () => {
    const a = Math.random() * Math.PI * 2
    const s = 3 + Math.random() * 6
    return {
      x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s - 3,
      r: 2 + Math.random() * 3.5, rot: Math.random() * Math.PI,
      vr: (Math.random() - 0.5) * 0.5,
      col: colors[(Math.random() * colors.length) | 0]!, life: 1,
    }
  })

  ;(function frame() {
    c.clearRect(0, 0, innerWidth, innerHeight)
    let alive = 0
    for (const b of bits) {
      b.vy += 0.28
      b.vx *= 0.99
      b.x += b.vx
      b.y += b.vy
      b.rot += b.vr
      b.life -= 0.016
      if (b.life <= 0) continue
      alive++
      c.save()
      c.globalAlpha = Math.max(b.life, 0)
      c.translate(b.x, b.y)
      c.rotate(b.rot)
      c.fillStyle = b.col
      c.fillRect(-b.r, -b.r * 0.6, b.r * 2, b.r * 1.2)
      c.restore()
    }
    if (alive) requestAnimationFrame(frame)
    else cv.remove()
  })()
}

/** C-E-G-C with a shimmer over the top. Played once, when the list clears. */
export function playCompletionFanfare() {
  if (prefersReducedMotion()) return
  try {
    const ctx = new AudioContext()
    const t = ctx.currentTime
    const master = ctx.createGain()
    master.gain.setValueAtTime(0.18, t)
    master.gain.exponentialRampToValueAtTime(0.001, t + 0.85)
    master.connect(ctx.destination)

    const notes: Array<{ freq: number; type: OscillatorType; at: number; dur: number }> = [
      { freq: 523.25, type: 'sine', at: 0, dur: 0.28 },
      { freq: 659.25, type: 'sine', at: 0.09, dur: 0.28 },
      { freq: 783.99, type: 'sine', at: 0.18, dur: 0.28 },
      { freq: 1046.5, type: 'triangle', at: 0.28, dur: 0.42 },
    ]
    for (const { freq, type, at, dur } of notes) {
      const osc = ctx.createOscillator()
      const g = ctx.createGain()
      osc.type = type
      osc.frequency.value = freq
      const start = t + at
      g.gain.setValueAtTime(0, start)
      g.gain.linearRampToValueAtTime(type === 'triangle' ? 0.55 : 0.4, start + 0.02)
      g.gain.exponentialRampToValueAtTime(0.001, start + dur)
      osc.connect(g)
      g.connect(master)
      osc.start(start)
      osc.stop(start + dur + 0.02)
    }

    const shimmer = ctx.createOscillator()
    const sg = ctx.createGain()
    shimmer.type = 'sine'
    shimmer.frequency.setValueAtTime(1318, t + 0.32)
    shimmer.frequency.exponentialRampToValueAtTime(2093, t + 0.58)
    sg.gain.setValueAtTime(0.12, t + 0.32)
    sg.gain.exponentialRampToValueAtTime(0.001, t + 0.62)
    shimmer.connect(sg)
    sg.connect(master)
    shimmer.start(t + 0.32)
    shimmer.stop(t + 0.64)
    setTimeout(() => void ctx.close(), 900)
  } catch {
    /* audio is decoration */
  }
}

/**
 * The clipboard ladder. The async Clipboard API needs a clipboard-write grant
 * that a sandboxed iframe — a hosted Artifact — does not give, so it rejects
 * there. Fall back to `execCommand('copy')` on a temp textarea, which rides the
 * user gesture and works in most sandboxes and on `file://`. If even that
 * fails, leave the text selected so ⌘C works. Never a dead "copy failed".
 */
export async function copyText(text: string): Promise<boolean> {
  try {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(text)
      return true
    }
  } catch {
    /* fall through to the gesture-bound path */
  }
  const ta = document.createElement('textarea')
  ta.value = text
  ta.setAttribute('readonly', '')
  ta.style.cssText = 'position:fixed;top:0;left:0;opacity:0;pointer-events:none'
  document.body.appendChild(ta)
  ta.focus()
  ta.select()
  let ok = false
  try {
    ok = document.execCommand('copy')
  } catch {
    ok = false
  }
  document.body.removeChild(ta)
  return ok
}
