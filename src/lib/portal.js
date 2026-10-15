// Moves an element to <body>, so position: fixed is relative to the screen
// even when an ancestor has a transform or will-change.
export function portal(node) {
  document.body.appendChild(node)
  return {
    destroy() {
      node.remove()
    },
  }
}