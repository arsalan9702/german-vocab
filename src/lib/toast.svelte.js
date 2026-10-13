export const toasts = $state({ items: [] })
let n = 0

export function toast(msg, kind = 'ok') {
  const id = ++n
  toasts.items.push({ id, msg, kind })
  setTimeout(() => {
    toasts.items = toasts.items.filter((t) => t.id !== id)
  }, 2400)
}