<template>
  <svg v-if="kind === 'shrimp'" viewBox="0 0 180 140" fill="none" aria-hidden="true" class="arcade-art">
    <ellipse cx="86" cy="124" rx="55" ry="8" fill="currentColor" opacity=".08" />
    <path d="M117 41C88 17 45 28 34 62c-10 32 16 58 49 48 17-5 29-20 23-31-4-8-14-10-19-3-4 6 4 9 0 13-8 8-24 1-22-14 3-18 23-23 38-11" :fill="clean ? '#ffe9c6' : '#fb986f'" stroke="#9f453a" stroke-width="4" stroke-linejoin="round" />
    <path d="m104 61 26 10-4-19 20-9-27-9" :fill="clean ? '#fff3da' : '#f97960'" stroke="#9f453a" stroke-width="4" stroke-linejoin="round" />
    <path d="M52 42 65 60M38 63l24 6M39 86l25-6M56 103l17-15M80 110l1-17" stroke="#9f453a" stroke-width="3" stroke-linecap="round" :opacity="clean ? '.18' : '.7'" />
    <path d="M110 37q15-32 39-20M108 37q6-25 0-28" stroke="#9f453a" stroke-width="3" stroke-linecap="round" />
    <circle cx="116" cy="45" r="4" fill="#253f3b" /><circle cx="117" cy="44" r="1.2" fill="white" />
    <path d="m42 101-7 11m24-5-2 12m40-15 6 8" stroke="#9f453a" stroke-width="3" stroke-linecap="round" />
    <g v-if="clean" stroke="#168475" stroke-width="3" stroke-linecap="round"><path d="M144 83v16m-8-8h16M21 29v12m-6-6h12" /></g>
  </svg>
  <svg v-else-if="kind === 'worker'" viewBox="0 0 180 160" fill="none" aria-hidden="true" class="arcade-art">
    <path d="M29 153c0-34 17-54 61-54s61 20 61 54" :fill="color" />
    <path d="m64 106 7 20h38l7-20 10 47H54z" fill="#fff4de" />
    <path d="M64 51c-19-3-25 37-15 45 1-15 12-14 15-27m52-18c19-3 25 37 15 45-1-15-12-14-15-27" fill="#384e47" />
    <rect x="59" y="35" width="62" height="73" rx="30" fill="#d9956e" />
    <path d="M55 51c0-42 70-42 70 0-12 0-24-7-33-15-9 10-22 15-37 15" fill="#384e47" />
    <path d="M53 47c0-48 74-48 74 0l-9-9H62z" :fill="color" />
    <path d="M55 44h70" stroke="#fff4de" stroke-width="7" stroke-linecap="round" />
    <circle cx="78" cy="68" r="3" fill="#253f3b" /><circle cx="104" cy="68" r="3" fill="#253f3b" />
    <path d="M82 86q9 9 18-1" stroke="#743f37" stroke-width="3" stroke-linecap="round" />
    <circle cx="70" cy="79" r="6" fill="#f18570" opacity=".6" /><circle cx="112" cy="79" r="6" fill="#f18570" opacity=".6" />
    <path d="M80 141h21" stroke="#d6bea0" stroke-width="3" stroke-linecap="round" />
  </svg>
  <svg v-else viewBox="0 0 180 140" fill="none" aria-hidden="true" class="arcade-art">
    <ellipse cx="90" cy="126" rx="65" ry="7" fill="currentColor" opacity=".08" />
    <path d="M30 56h120l-12 64H42z" :fill="color" stroke="#254e47" stroke-width="4" stroke-linejoin="round" />
    <path d="m57 69 4 39m28-39v39m31-39-4 39M40 84h101M44 102h93" stroke="#fff4de" stroke-width="4" opacity=".65" />
    <rect x="23" y="49" width="134" height="15" rx="6" :fill="color" stroke="#254e47" stroke-width="4" />
    <path d="M57 47c-17-23 9-40 21-24s-4 17-10 10m25 14c-9-20 15-35 29-19s-2 20-11 12" stroke="#f48f6f" stroke-width="12" stroke-linecap="round" />
    <path d="m133 20 3-8m8 17 8-2M37 29l-7-5" stroke="#deaa40" stroke-width="3" stroke-linecap="round" />
  </svg>
</template>
<script>
export default { name: 'ArcadeArt', props: { kind: { type: String, default: 'shrimp' }, clean: Boolean, color: { type: String, default: '#2c8a78' } } };
</script>
