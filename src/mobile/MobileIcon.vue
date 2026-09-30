<template>
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" class="rp-icon">
    <path v-for="(path, i) in paths" :key="i" :d="path" />
  </svg>
</template>
<script>
const icons = {
  fish: ['M5 12c4-7 11-7 16 0-5 7-12 7-16 0Z', 'M5 12 1 8v8l4-4', 'M14 10h.01', 'm10 6 3-3 3 4'],
  home: ['m3 10 9-7 9 7', 'M5 9v12h14V9', 'M9 21v-7h6v7'],
  box: ['m3 7 9-4 9 4v10l-9 4-9-4Z', 'm3 7 9 5 9-5', 'M12 12v9'],
  moves: ['M7 20V4', 'm3 8 4-4 4 4', 'M17 4v16', 'm13 16 4 4 4-4'],
  arrow: ['M5 12h14', 'm13 6 6 6-6 6'],
  chevron: ['m6 9 6 6 6-6'],
  summary: ['M5 3h14v18H5Z', 'M9 7h6', 'M9 11h6', 'M9 15h6'],
  back: ['M19 12H5', 'm11 6-6 6 6 6'],
  search: ['M15.5 15.5 21 21', 'M18 10a8 8 0 1 1-16 0 8 8 0 0 1 16 0'],
  plus: ['M12 5v14', 'M5 12h14'],
  in: ['M12 3v12', 'm7 10 5 5 5-5', 'M4 16v5h16v-5'],
  out: ['M12 15V3', 'm7 8 5-5 5 5', 'M4 16v5h16v-5'],
  edit: ['m16 3 5 5-12 12-6 1 1-6Z', 'm14 5 5 5'],
  trash: ['M3 6h18', 'M9 6V3h6v3', 'M5 6l1 15h12l1-15', 'M10 10v7', 'M14 10v7'],
  check: ['m4 12 5 5L20 6'],
  close: ['m6 6 12 12', 'm6 18 12-12'],
  refresh: ['M20 7V2l-4 4', 'M20 7a9 9 0 1 0 1 8'],
  volume: ['M11 4 6 8H3v8h3l5 4Z', 'M15 8a6 6 0 0 1 0 8', 'M18 5a10 10 0 0 1 0 14'],
  muted: ['M11 4 6 8H3v8h3l5 4Z', 'm16 9 5 6', 'm21 9-5 6'],
  clock: ['M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0', 'M12 7v5l3 2']
};
export default { props: { name: String }, computed: { paths() { return icons[this.name] || icons.box; } } };
</script>
