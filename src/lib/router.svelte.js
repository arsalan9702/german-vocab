import { flushSync } from 'svelte'

const read = () => location.hash.replace(/^#/, '') || '/'
const s = $state({ raw: read() })

const safe = (x) => {
  try {
    return decodeURIComponent(x)
  } catch {
    return x
  }
}

// Routes: /  /chapter/:id  /word/:id  /edit/:id  /study/:id  /add?chapter=:id  /search  /settings
function parse(raw) {
  const [path, qs = ''] = raw.split('?')
  const seg = path.split('/').filter(Boolean).map(safe)
  const query = new URLSearchParams(qs)
  const [a, id] = seg

  let name = 'notfound'
  if (seg.length === 0) name = 'chapters'
  else if (seg.length === 2 && ['chapter', 'word', 'edit', 'study'].includes(a)) name = a
  else if (seg.length === 1 && ['add', 'search', 'settings'].includes(a)) name = a

  return { name, id, query, key: raw }
}

export const route = () => parse(s.raw)

/* ---------- Page transition: the new page slides in, nothing is cloned ---------- */

// Depth in the drill-down stack. Tab roots (add, search, settings) are not in it: they fade.
const DEPTH = { chapters: 0, chapter: 1, word: 2, study: 2, edit: 3 }

function direction(from, to) {
  if (!(from in DEPTH) || !(to in DEPTH)) return 'fade'
  if (DEPTH[to] > DEPTH[from]) return 'forward'
  if (DEPTH[to] < DEPTH[from]) return 'back'
  return 'fade'
}

const SLIDE = { forward: 28, back: -28, fade: 0 }

// Debug switches, set before the #: ?nav=none (no animation), ?nav=slide (no opacity), ?probe=1
const params = new URLSearchParams(typeof location !== 'undefined' ? location.search : '')
const NAV = params.get('nav')
const PROBE = params.get('probe') === '1'

// Shows how long a navigation took to render and to reach its first two frames.
function probe(t0, tRender) {
  requestAnimationFrame((t1) =>
    requestAnimationFrame((t2) => {
      let el = document.getElementById('probe')
      if (!el) {
        el = document.createElement('div')
        el.id = 'probe'
        el.style.cssText =
          'position:fixed;top:60px;right:8px;z-index:10000;padding:4px 8px;font:12px monospace;background:#000;color:#fff;pointer-events:none;white-space:pre'
        document.body.appendChild(el)
      }
      const line = `render ${Math.round(tRender - t0)}  f1 ${Math.round(t1 - t0)}  f2 ${Math.round(t2 - t0)}`
      el.textContent = (line + '\n' + el.textContent).split('\n').slice(0, 6).join('\n')
    }),
  )
}

function navigate(raw) {
  if (raw === s.raw) return

  const t0 = performance.now()
  const dir = direction(parse(s.raw).name, parse(raw).name)

  s.raw = raw
  flushSync() // the new page is in the DOM right now
  if (PROBE) probe(t0, performance.now())

  const scroller = document.querySelector('.shell')
  if (scroller) scroller.scrollTop = 0

  if (NAV === 'none' || matchMedia('(prefers-reduced-motion: reduce)').matches) return

  const from = { opacity: 0, transform: `translateX(${SLIDE[dir]}px)` }
  const to = { opacity: 1, transform: 'translateX(0)' }
  if (NAV === 'slide') delete from.opacity, delete to.opacity
  document.querySelector('.view')?.animate(
    [from, to],
    { duration: 260, easing: 'cubic-bezier(0.32, 0.72, 0, 1)', fill: 'backwards' },
  )
}

if (typeof window !== 'undefined') {
  history.scrollRestoration = 'manual'
  window.addEventListener('hashchange', () => navigate(read()))
}

export const go = (path) => {
  location.hash = path
}

export function back(fallback = '/') {
  if (history.length > 1) history.back()
  else go(fallback)
}