<template>
  <svg v-if="kind === 'shrimp'" viewBox="0 0 180 140" fill="none" aria-hidden="true" class="arcade-art">
    <defs><linearGradient :id="id" x1=".2" y1="0" x2=".8" y2="1" gradientUnits="objectBoundingBox"><stop :stop-color="bad ? '#b3aa7c' : clean ? '#fff9e6' : '#ffd8af'"/><stop offset=".45" :stop-color="bad ? '#878660' : clean ? '#ffdabb' : '#ffae77'"/><stop offset="1" :stop-color="bad ? '#5b664d' : clean ? '#e4a078' : '#db614a'"/></linearGradient></defs>
    <ellipse cx="86" cy="124" rx="55" ry="8" fill="currentColor" opacity=".08" />
    <path d="M117 41C88 17 45 28 34 62c-10 32 16 58 49 48 17-5 29-20 23-31-4-8-14-10-19-3-4 6 4 9 0 13-8 8-24 1-22-14 3-18 23-23 38-11" :fill="`url(#${id})`" stroke="#813e35" stroke-width="2.5" stroke-linejoin="round" />
    <path d="m104 61 26 10-4-19 20-9-27-9" :fill="`url(#${id})`" stroke="#813e35" stroke-width="2.5" stroke-linejoin="round" />
    <path d="M105 36C80 22 49 38 43 58" stroke="#fff5da" stroke-width="4" stroke-linecap="round" opacity=".8"/>
    <path d="M52 42 65 60M38 63l24 6M39 86l25-6M56 103l17-15M80 110l1-17" stroke="#9f453a" stroke-width="3" stroke-linecap="round" :opacity="clean ? '.18' : '.7'" />
    <path d="M110 37q15-32 39-20M108 37q6-25 0-28" stroke="#9f453a" stroke-width="3" stroke-linecap="round" />
    <circle cx="116" cy="45" r="4" fill="#253f3b" /><circle cx="117" cy="44" r="1.2" fill="white" />
    <path d="m42 101-7 11m24-5-2 12m40-15 6 8" stroke="#9f453a" stroke-width="3" stroke-linecap="round" />
    <path d="m96 78 11-8 7 12-12 4 9 9-10 7-10-14" :fill="`url(#${id})`" stroke="#9f453a" stroke-width="1.5"/>
    <g v-if="bad" fill="#3a4b32" opacity=".9"><ellipse cx="72" cy="41" rx="6" ry="4"/><circle cx="48" cy="70" r="5"/><ellipse cx="67" cy="98" rx="7" ry="4"/><circle cx="94" cy="47" r="4"/><circle cx="53" cy="53" r="3"/></g>
    <g v-if="clean" stroke="#168475" stroke-width="3" stroke-linecap="round"><path d="M144 83v16m-8-8h16M21 29v12m-6-6h12" /></g>
  </svg>
  <svg v-else-if="kind === 'worker'" viewBox="0 0 180 160" fill="none" aria-hidden="true" class="arcade-art">
    <defs><linearGradient :id="id" x2="1" y2="1"><stop stop-color="#ffffff" stop-opacity=".3"/><stop offset=".4" :stop-color="color"/><stop offset="1" stop-color="#153e48"/></linearGradient><radialGradient :id="id + 'skin'" cx=".35" cy=".3" r=".8"><stop stop-color="#ffd7ad"/><stop offset="1" stop-color="#b87754"/></radialGradient></defs>
    <path d="M29 153c0-34 17-54 61-54s61 20 61 54" :fill="`url(#${id})`" stroke="#254b48" stroke-width="1.5" />
    <path d="m64 106 7 20h38l7-20 10 47H54z" fill="#fff4de" />
    <path d="M64 51c-19-3-25 37-15 45 1-15 12-14 15-27m52-18c19-3 25 37 15 45-1-15-12-14-15-27" fill="#384e47" />
    <ellipse cx="58" cy="72" rx="6" ry="10" fill="#c9956e"/><ellipse cx="122" cy="72" rx="6" ry="10" fill="#c9956e"/>
    <rect x="59" y="35" width="62" height="73" rx="30" :fill="`url(#${id}skin)`" />
    <path d="M55 51c0-42 70-42 70 0-12 0-24-7-33-15-9 10-22 15-37 15" fill="#384e47" />
    <path d="M53 47c0-48 74-48 74 0l-9-9H62z" :fill="`url(#${id})`" stroke="#284f48" stroke-width="1.5" />
    <path d="m68 19-5 14m17-19-3 17m18-18 1 18m13-14 7 17" stroke="#fff6de" stroke-opacity=".35" stroke-width="2"/>
    <path d="M55 44h70" stroke="#fff4de" stroke-width="7" stroke-linecap="round" />
    <circle cx="78" cy="68" r="3" fill="#253f3b" /><circle cx="104" cy="68" r="3" fill="#253f3b" />
    <path d="m73 60 10-1m16 0 10 1m-18 11-2 7h4" stroke="#8b6349" stroke-width="2" stroke-linecap="round"/>
    <circle cx="79" cy="67" r="1" fill="#fff"/><circle cx="105" cy="67" r="1" fill="#fff"/>
    <path d="M82 86q9 9 18-1" stroke="#743f37" stroke-width="3" stroke-linecap="round" />
    <circle cx="70" cy="79" r="6" fill="#f18570" opacity=".6" /><circle cx="112" cy="79" r="6" fill="#f18570" opacity=".6" />
    <path d="M80 141h21" stroke="#d6bea0" stroke-width="3" stroke-linecap="round" />
    <path d="M76 130h28v17H76z" fill="#f2dec1" stroke="#c6ad86"/><path d="M86 137q7-8 10 0t-7 4" stroke="#df8f65" stroke-width="2"/>
    <path d="M34 145q11-16 25-5m89 5q-11-16-25-5" stroke="#f4cca0" stroke-width="13" stroke-linecap="round"/>
  </svg>
  <svg v-else viewBox="0 0 180 140" fill="none" aria-hidden="true" class="arcade-art">
    <defs><linearGradient :id="id" x2=".8" y2="1"><stop stop-color="#9de0bf"/><stop offset=".4" :stop-color="color"/><stop offset="1" stop-color="#173e49"/></linearGradient></defs>
    <ellipse cx="90" cy="126" rx="65" ry="7" fill="currentColor" opacity=".08" />
    <path d="M30 56h120l-12 64H42z" :fill="`url(#${id})`" stroke="#254e47" stroke-width="3" stroke-linejoin="round" />
    <path d="m150 56 12-9-13 64-11 9z" fill="#193f49"/><path d="M42 121h96l11-10" stroke="#142c38" stroke-width="3"/>
    <path d="m57 69 4 39m28-39v39m31-39-4 39M40 84h101M44 102h93" stroke="#fff4de" stroke-width="4" opacity=".65" />
    <rect x="23" y="49" width="134" height="15" rx="6" :fill="color" stroke="#254e47" stroke-width="4" />
    <path d="M29 53h120" stroke="#b8edce" stroke-width="3" stroke-linecap="round"/>
    <path d="M57 47c-17-23 9-40 21-24s-4 17-10 10m25 14c-9-20 15-35 29-19s-2 20-11 12" stroke="#f48f6f" stroke-width="12" stroke-linecap="round" />
    <path d="m133 20 3-8m8 17 8-2M37 29l-7-5" stroke="#deaa40" stroke-width="3" stroke-linecap="round" />
  </svg>
</template>
<script>
export default { name: 'ArcadeArt', props: { kind: { type: String, default: 'shrimp' }, clean: Boolean, bad: Boolean, color: { type: String, default: '#2c8a78' } }, computed: { id() { return `marea-art-${this._uid}`; } } };
</script>
