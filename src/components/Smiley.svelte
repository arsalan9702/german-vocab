<script>
  let { size = 96 } = $props()
</script>

<svg class="sticker" viewBox="0 0 100 100" width={size} height={size} aria-hidden="true">
  <circle cx="50" cy="50" r="44" fill="#ffd51f" stroke="#000" stroke-width="5" />
  <ellipse cx="36" cy="40" rx="5" ry="9" fill="#000" />
  <ellipse cx="64" cy="40" rx="5" ry="9" fill="#000" />
  <path d="M26 58 Q50 84 74 58" fill="none" stroke="#000" stroke-width="6" stroke-linecap="round" />
</svg>