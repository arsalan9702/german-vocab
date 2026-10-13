<script>
  let { name } = $props()

  const tabs = [
    { href: '#/', label: 'Chapters', icon: 'book', on: ['chapters', 'chapter', 'word', 'study'] },
    { href: '#/search', label: 'Search', icon: 'search', on: ['search'] },
    { href: '#/add', label: 'Add', icon: 'plus', on: ['add', 'edit'], primary: true },
    { href: '#/settings', label: 'Settings', icon: 'sliders', on: ['settings'] },
  ]
</script>

<nav class="tabbar" aria-label="Main">
  {#each tabs as t (t.href)}
    {@const active = t.on.includes(name)}
    <a
      class="tab"
      class:active
      class:primary={t.primary}
      href={t.href}
      aria-current={active ? 'page' : undefined}
    >
      <span class="tab-ico">
        <svg
          viewBox="0 0 24 24"
          width="24"
          height="24"
          fill="none"
          stroke="currentColor"
          stroke-width="2.6"
          stroke-linecap="round"
          stroke-linejoin="round"
          aria-hidden="true"
        >
          {#if t.icon === 'book'}
            <path d="M5 4h14v16H7a2 2 0 0 1-2-2z" />
            <path d="M9 8h6" />
          {:else if t.icon === 'search'}
            <circle cx="11" cy="11" r="6.5" />
            <path d="M16 16l4.5 4.5" />
          {:else if t.icon === 'plus'}
            <path d="M12 5v14M5 12h14" />
          {:else}
            <path d="M4 7h10M18 7h2M4 17h2M10 17h10" />
            <circle cx="16" cy="7" r="2" />
            <circle cx="8" cy="17" r="2" />
          {/if}
        </svg>
      </span>
      <span>{t.label}</span>
    </a>
  {/each}
</nav>