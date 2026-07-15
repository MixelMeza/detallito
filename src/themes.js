import * as THREE from 'three'

/*
 * Temas: fondo (degradado), iluminacion y bloom.
 * Cada tema devuelve una textura de fondo generada por canvas + parametros de luz.
 */

function gradientTexture(stops) {
  const c = document.createElement('canvas')
  c.width = 16
  c.height = 256
  const ctx = c.getContext('2d')
  const g = ctx.createLinearGradient(0, 0, 0, 256)
  stops.forEach(([o, col]) => g.addColorStop(o, col))
  ctx.fillStyle = g
  ctx.fillRect(0, 0, 16, 256)
  const tex = new THREE.CanvasTexture(c)
  tex.colorSpace = THREE.SRGBColorSpace
  tex.mapping = THREE.EquirectangularReflectionMapping
  return tex
}

export const THEMES = {
  estudio: {
    name: 'Estudio',
    thumb: 'linear-gradient(160deg,#efeaf7,#c9bedd)',
    background: () => gradientTexture([[0, '#f3eef9'], [0.55, '#d8cee8'], [1, '#b3a6cf']]),
    hemi: { sky: 0xffffff, ground: 0xcdbfe0, intensity: 1.15 },
    key: { color: 0xffffff, intensity: 2.2, pos: [4, 8, 5] },
    rim: { color: 0xdfe8ff, intensity: 1.0, pos: [-5, 4, -4] },
    bloom: 0.12,
    fog: null
  },
  atardecer: {
    name: 'Atardecer',
    thumb: 'linear-gradient(160deg,#ffd39b,#c65f6e 60%,#4a2a56)',
    background: () => gradientTexture([[0, '#ffe3b0'], [0.4, '#f2a06a'], [0.75, '#a94f6b'], [1, '#3d2350']]),
    hemi: { sky: 0xffd9a0, ground: 0x5a2f4a, intensity: 0.9 },
    key: { color: 0xffb877, intensity: 2.6, pos: [6, 5, 3] },
    rim: { color: 0xff8fb0, intensity: 1.3, pos: [-5, 3, -5] },
    bloom: 0.15,
    fog: 0x3d2350
  },
  noche: {
    name: 'Noche',
    thumb: 'linear-gradient(160deg,#1b2452,#0a0e26 70%,#05060f)',
    background: () => gradientTexture([[0, '#243063'], [0.5, '#111838'], [1, '#05060f']]),
    hemi: { sky: 0x3a4a8a, ground: 0x0a0c1a, intensity: 0.5 },
    key: { color: 0x9fb8ff, intensity: 1.7, pos: [3, 7, 4] },
    rim: { color: 0xc9a0ff, intensity: 1.3, pos: [-5, 3, -4] },
    bloom: 0.12,
    fog: 0x05060f
  },
  jardin: {
    name: 'Jardín',
    thumb: 'linear-gradient(160deg,#dff3d6,#8fc78a 60%,#3f7d55)',
    background: () => gradientTexture([[0, '#eaf6e2'], [0.5, '#b6dda6'], [1, '#5c9a6b']]),
    hemi: { sky: 0xeafbe6, ground: 0x3f6b3a, intensity: 1.1 },
    key: { color: 0xfff4d6, intensity: 2.4, pos: [5, 8, 4] },
    rim: { color: 0xcfeecb, intensity: 1.0, pos: [-4, 4, -5] },
    bloom: 0.15,
    fog: null
  },
  rosa: {
    name: 'Ensueño',
    thumb: 'linear-gradient(160deg,#ffe6f2,#f5b8d6 55%,#8f5aa8)',
    background: () => gradientTexture([[0, '#ffe9f4'], [0.5, '#f2bcdb'], [1, '#9163b0']]),
    hemi: { sky: 0xffe6f5, ground: 0x6b4a7a, intensity: 1.05 },
    key: { color: 0xffd9ec, intensity: 2.4, pos: [4, 7, 5] },
    rim: { color: 0xc9a8ff, intensity: 1.2, pos: [-5, 4, -4] },
    bloom: 0.2,
    fog: null
  }
}

export const THEME_ORDER = ['estudio', 'atardecer', 'noche', 'jardin', 'rosa']
