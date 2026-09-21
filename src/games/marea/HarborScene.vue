<template>
  <svg viewBox="0 0 600 400" preserveAspectRatio="xMidYMid slice" aria-hidden="true" class="harbor-scene">
    <defs>
      <linearGradient :id="id + 'sky'" x2="0" y2="1"><stop stop-color="#28576e"/><stop offset=".6" stop-color="#86bbb6"/><stop offset="1" stop-color="#f8d3a0"/></linearGradient>
      <linearGradient :id="id + 'sea'" x2="0" y2="1"><stop stop-color="#358f94"/><stop offset="1" stop-color="#102d46"/></linearGradient>
      <radialGradient :id="id + 'sun'"><stop stop-color="#fff3c7" stop-opacity=".8"/><stop offset="1" stop-color="#ffd38a" stop-opacity="0"/></radialGradient>
    </defs>
    <path fill="#245368" d="M0 0h600v400H0z"/>
    <path :fill="`url(#${id}sky)`" d="M0 0h600v265H0z"/>
    <circle cx="441" cy="117" r="116" :fill="`url(#${id}sun)`"/><circle cx="441" cy="117" r="39" fill="#ffe7ac"/>
    <g fill="#e8f3e9" opacity=".25"><path d="M18 79q22-28 48-12 31-28 58-1 36-10 46 17H18z"/><path d="M244 45q20-25 41-8 25-18 47 5h39l10 9H231z"/></g>
    <path d="M0 218 48 157 80 181 135 122 192 177 233 151 309 216 360 173 422 223z" fill="#437b83" opacity=".7"/>
    <path d="m0 223 89-28 69 17 86-32 89 37 104-18 76 29 87-11v44H0z" fill="#30646e"/>
    <path :fill="`url(#${id}sea)`" d="M0 235h600v165H0z"/>
    <g stroke="#7bc1ba" stroke-width="2" opacity=".45"><path d="M16 267h64m22 10h51m59-23h80m64 31h84m49-26h87M34 316h116m16-16h69m80 14h72m71-14h104M4 370h84m30-23h98m38 19h135m27-28h148"/></g>
    <g fill="#f6d79b" opacity=".35"><path d="m404 244 72 0-11 5h-53zM395 258h91l-18 4h-67zM391 275h99v3h-99zM407 290h54v2h-54z"/></g>
    <g class="harbor-boat">
      <path d="m333 241 106 0-19 24h-66z" fill="#edba75" stroke="#234b5a" stroke-width="3"/>
      <path d="m344 251 87 0-11 14h-66z" fill="#bd6952"/>
      <path d="M364 217h40v24h-40z" fill="#f4dfb8"/><path d="M370 223h11v12h-11zm17 0h11v12h-11z" fill="#306078"/>
      <path d="M389 173v44m0-38 32 36m-32-35-31 34" stroke="#e6d3ad" stroke-width="3"/><path d="M389 177h24l-7 10h-17z" fill="#ef9567"/>
      <path d="m360 269 72 0" stroke="#94d0c1" stroke-width="2"/>
    </g>
    <g fill="#244858"><path d="M50 152h16v110H50zM33 166h51v7H33z"/><path d="m48 153 4-70h12l4 70z" fill="#fff0c9"/><path d="M52 97h12v18H52z" fill="#bd6e57"/><path d="m44 84 14-14 15 14z" fill="#284958"/><path d="M52 84h12v8H52z" fill="#ffe898"/></g>
    <g fill="none" stroke="#1a4a5d" stroke-width="2" stroke-linecap="round"><path d="M228 98q8-8 16 0 8-8 16 0M296 132q6-6 12 0 6-6 12 0"/></g>
    <path d="M0 342 205 318 243 342 0 379z" fill="#a26e53"/><path d="m0 351 222-21m-222 34 232-26" stroke="#deb08a" stroke-width="3"/>
    <path d="M27 344v56m118-69v69m68-65v65" stroke="#493e3a" stroke-width="13"/>
    <path d="M20 319h14v34H20zm118-11h14v29h-14z" fill="#826048"/>
    <path d="M27 320q60 28 118-10" fill="none" stroke="#d3b38c" stroke-width="3"/>
    <path d="M514 287q13-52-13-81m16 35q18-23 45-14m-47-4q-21-24-49-7m41-6q1-30 26-36m-29 29q-29-21-50-13" fill="none" stroke="#264b4c" stroke-width="8" stroke-linecap="round"/>
  </svg>
</template>
<script>
export default { name: 'HarborScene', computed: { id() { return `harbor-${this._uid}-`; } } };
</script>
