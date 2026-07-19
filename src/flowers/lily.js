import * as THREE from 'three'

/*
 * Lirio (Lilium) procedural.
 * - 6 tepalos dispuestos en dos verticilos de 3.
 * - Cada tepalo es una malla curva generada como rejilla, con DOS estados
 *   (cerrado / abierto) guardados como morph target -> floracion suave con un
 *   solo influence 0..1.
 * - Estambres (filamentos + anteras) y pistilo en el centro.
 */

const U = 20 // segmentos a lo largo del tepalo
const V = 10 // segmentos a lo ancho
const LENGTH = 2.5
const MAX_WIDTH = 0.6
const BASE_RADIUS = 0.1

// grados -> radianes
const rad = (d) => (d * Math.PI) / 180

// Angulo del tepalo respecto a la vertical, en funcion de u (0 base .. 1 punta)
function tepalAngle(u, open) {
  if (open) {
    // lirio oriental abierto: sale casi horizontal y la punta se recurva
    // fuertemente hacia atras (>90 grados) como en la foto de referencia
    return rad(30 + 150 * Math.pow(u, 1.1))
  }
  // cerrado: las puntas convergen hacia dentro cerrando en punta el capullo
  return rad(5 - 17 * u)
}

// Semiancho del tepalo (forma lanceolada, punta afilada) en funcion de u
function tepalWidth(u) {
  return MAX_WIDTH * Math.pow(Math.sin(Math.PI * u), 0.66) * (1 - 0.22 * u)
}

// Construye las posiciones de un tepalo para un estado dado
function buildTepalPositions(open) {
  const positions = []
  const uvs = []

  // centerline integrada en el plano YZ (x = 0)
  const cy = [0]
  const cz = [BASE_RADIUS]
  const ds = LENGTH / U
  for (let i = 1; i <= U; i++) {
    const uMid = (i - 0.5) / U
    const th = tepalAngle(uMid, open)
    cy.push(cy[i - 1] + Math.cos(th) * ds)
    cz.push(cz[i - 1] + Math.sin(th) * ds)
  }

  const channel = open ? 0.08 : 0.42 // canal/cuenco transversal (cerrado envuelve mas)

  for (let i = 0; i <= U; i++) {
    const u = i / U
    const w = tepalWidth(u)

    // tangente para la normal de superficie (en YZ)
    const iN = Math.min(i, U - 1)
    const dy = cy[iN + 1] - cy[iN]
    const dz = cz[iN + 1] - cz[iN]
    const tl = Math.hypot(dy, dz) || 1
    // normal en YZ perpendicular a la tangente: N = (0, dz, -dy)
    const ny = dz / tl
    const nz = -dy / tl

    // borde ondulado (ruffle) tipico del lirio oriental, solo cuando abre
    const ruffle = open ? Math.sin(u * Math.PI * 5.0) * 0.05 : 0

    for (let j = 0; j <= V; j++) {
      const v = (j / V) * 2 - 1 // -1 .. 1
      const across = v * w
      // cuenco + ondulacion en los bordes a lo largo de la normal
      const cup = channel * (v * v) * w + ruffle * (v * v)
      const x = across
      const y = cy[i] + ny * cup
      const z = cz[i] + nz * cup
      positions.push(x, y, z)
      uvs.push((v + 1) / 2, u)
    }
  }
  return { positions, uvs }
}

function buildTepalGeometry() {
  const closed = buildTepalPositions(false)
  const open = buildTepalPositions(true)

  const geo = new THREE.BufferGeometry()
  geo.setAttribute('position', new THREE.Float32BufferAttribute(closed.positions, 3))
  geo.setAttribute('uv', new THREE.Float32BufferAttribute(closed.uvs, 2))

  const indices = []
  const stride = V + 1
  for (let i = 0; i < U; i++) {
    for (let j = 0; j < V; j++) {
      const a = i * stride + j
      const b = a + 1
      const c = a + stride
      const d = c + 1
      indices.push(a, c, b, b, c, d)
    }
  }
  geo.setIndex(indices)
  geo.computeVertexNormals()

  // Estado abierto como morph target (posicion + normal para buen sombreado)
  const openGeo = new THREE.BufferGeometry()
  openGeo.setAttribute('position', new THREE.Float32BufferAttribute(open.positions, 3))
  openGeo.setIndex(indices)
  openGeo.computeVertexNormals()

  geo.morphAttributes.position = [openGeo.getAttribute('position').clone()]
  geo.morphAttributes.normal = [openGeo.getAttribute('normal').clone()]
  openGeo.dispose()

  return geo
}

// Geometria compartida entre todas las flores (memoria/rendimiento)
let sharedTepalGeo = null
function getTepalGeometry() {
  if (!sharedTepalGeo) sharedTepalGeo = buildTepalGeometry()
  return sharedTepalGeo
}

// Convierte "#rrggbb" a componentes 0-255
function hexToRgb(hex) {
  const h = hex.replace('#', '')
  return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)]
}
function mix(a, b, t) {
  return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t]
}
const rgb = (c) => `rgb(${Math.round(c[0])},${Math.round(c[1])},${Math.round(c[2])})`

/*
 * Textura del tepalo tipo lirio oriental (referencia real):
 *  - eje X del canvas = ancho del petalo (bordes en 0 y 1)
 *  - eje Y = largo; abajo (por flipY) = base/garganta, arriba = punta
 *  - bordes BLANCOS, centro ROSA, franja central mas intensa,
 *    garganta verde-blanca y pecas granate cerca de la base.
 */
export function makePetalTexture(baseHex = '#f2a0c4', throatHex = '#e6f0c2') {
  const c = document.createElement('canvas')
  c.width = 256
  c.height = 512
  const ctx = c.getContext('2d')

  const pink = hexToRgb(baseHex)
  const white = [255, 255, 255]
  const deep = mix(pink, [150, 20, 80], 0.35) // franja central mas saturada
  const throat = hexToRgb(throatHex)

  // Gradiente transversal: blanco en los bordes -> rosa hacia el centro
  const gx = ctx.createLinearGradient(0, 0, c.width, 0)
  gx.addColorStop(0.0, rgb(white))
  gx.addColorStop(0.16, rgb(mix(white, pink, 0.55)))
  gx.addColorStop(0.4, rgb(pink))
  gx.addColorStop(0.5, rgb(deep)) // vena/franja central
  gx.addColorStop(0.6, rgb(pink))
  gx.addColorStop(0.84, rgb(mix(white, pink, 0.55)))
  gx.addColorStop(1.0, rgb(white))
  ctx.fillStyle = gx
  ctx.fillRect(0, 0, c.width, c.height)

  // La punta (arriba del canvas) se aclara un poco
  const gtip = ctx.createLinearGradient(0, 0, 0, c.height * 0.35)
  gtip.addColorStop(0, 'rgba(255,255,255,0.35)')
  gtip.addColorStop(1, 'rgba(255,255,255,0)')
  ctx.fillStyle = gtip
  ctx.fillRect(0, 0, c.width, c.height * 0.35)

  // Garganta verde-blanca en la base (abajo del canvas)
  const gth = ctx.createLinearGradient(0, c.height, 0, c.height * 0.62)
  gth.addColorStop(0, rgb(throat))
  gth.addColorStop(0.55, 'rgba(240,248,220,0.6)')
  gth.addColorStop(1, 'rgba(255,255,255,0)')
  ctx.fillStyle = gth
  ctx.fillRect(0, c.height * 0.6, c.width, c.height * 0.4)

  // Pecas/papilas granate cerca de la base-centro (rasgo del lirio oriental)
  ctx.fillStyle = 'rgba(120,25,55,0.8)'
  const seed = [
    [0.5, 0.74, 4], [0.44, 0.8, 3], [0.56, 0.8, 3], [0.5, 0.86, 5],
    [0.46, 0.9, 3], [0.55, 0.91, 3], [0.5, 0.95, 4], [0.42, 0.7, 3],
    [0.58, 0.72, 3], [0.48, 0.66, 3], [0.53, 0.77, 3], [0.5, 0.68, 3],
    [0.4, 0.84, 2], [0.6, 0.86, 2]
  ]
  seed.forEach(([sx, sy, r]) => {
    ctx.beginPath()
    ctx.ellipse(sx * c.width, sy * c.height, r, r * 1.7, 0, 0, Math.PI * 2)
    ctx.fill()
  })

  const tex = new THREE.CanvasTexture(c)
  tex.colorSpace = THREE.SRGBColorSpace
  tex.anisotropy = 4
  return tex
}

/**
 * Crea una flor de lirio.
 * @returns { group, tepalMeshes, setBloom(t), stamens }
 */
// tinte del petalo: verdoso cuando es capullo, color pleno (blanco = textura) al abrir
const BUD_TINT = new THREE.Color('#c3d29a')
const OPEN_TINT = new THREE.Color('#ffffff')

// pseudo-aleatorio determinista (sin Math.random) a partir de una semilla
function hash(n) {
  const x = Math.sin(n * 127.1 + 311.7) * 43758.5453
  return x - Math.floor(x)
}

export function createLily({ petalMaterial, seed = 0 }) {
  const group = new THREE.Group()
  const tepalMeshes = []
  const geo = getTepalGeometry()

  // 6 tepalos en 2 verticilos de 3, con pequena asimetria organica por flor
  for (let i = 0; i < 6; i++) {
    const mesh = new THREE.Mesh(geo, petalMaterial)
    mesh.castShadow = true
    const inner = i % 2 === 0
    const angle = (i / 6) * Math.PI * 2 + (hash(seed * 6 + i) - 0.5) * 0.12
    mesh.rotation.y = angle
    // el verticilo interno un poco mas erguido; jitter para que no sea perfecto
    mesh.rotation.x = (inner ? -0.04 : 0.02) + (hash(seed * 13 + i) - 0.5) * 0.1
    mesh.rotation.z = (hash(seed * 17 + i) - 0.5) * 0.06
    mesh.position.y = inner ? 0.02 : 0
    // ligera variacion de tamano y de cuanto abre cada tepalo
    mesh.scale.y = 0.96 + hash(seed * 23 + i) * 0.1
    mesh.scale.x = 0.97 + hash(seed * 29 + i) * 0.07
    mesh.updateMorphTargets()
    mesh.userData.bloomBias = 0.9 + hash(seed * 31 + i) * 0.16
    mesh.morphTargetInfluences[0] = 0
    mesh.userData.isPetal = true
    group.add(mesh)
    tepalMeshes.push(mesh)
  }

  // Estambres: filamentos que se arquean hacia afuera + anteras granate grandes
  const stamenGroup = new THREE.Group()
  const filamentMat = new THREE.MeshStandardMaterial({ color: 0xeef0d0, roughness: 0.6 })
  const antherMat = new THREE.MeshStandardMaterial({ color: 0x6e1f22, roughness: 0.45, metalness: 0.05 })
  const antherGeo = new THREE.CapsuleGeometry(0.07, 0.32, 4, 10) // antera grande y alargada
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2
    // filamento arqueado desde el centro hacia afuera usando un tubo curvo
    const spread = 0.55
    const curve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(0, 0.15, 0),
      new THREE.Vector3(Math.cos(a) * spread * 0.4, 0.95, Math.sin(a) * spread * 0.4),
      new THREE.Vector3(Math.cos(a) * spread, 1.25, Math.sin(a) * spread)
    ])
    const fil = new THREE.Mesh(new THREE.TubeGeometry(curve, 12, 0.02, 5, false), filamentMat)
    stamenGroup.add(fil)

    const anther = new THREE.Mesh(antherGeo, antherMat)
    const tip = curve.getPoint(1)
    anther.position.copy(tip)
    anther.rotation.z = Math.PI / 2.4
    anther.rotation.y = a + Math.PI / 2
    stamenGroup.add(anther)
  }
  // Pistilo central verde, mas alto que los estambres
  const pistil = new THREE.Mesh(
    new THREE.CylinderGeometry(0.022, 0.035, 1.5, 8),
    new THREE.MeshStandardMaterial({ color: 0xbcd89a, roughness: 0.55 })
  )
  pistil.position.y = 0.75
  stamenGroup.add(pistil)
  const stigma = new THREE.Mesh(
    new THREE.SphereGeometry(0.07, 10, 10),
    new THREE.MeshStandardMaterial({ color: 0x8fb85f, roughness: 0.5 })
  )
  stigma.position.y = 1.5
  stigma.scale.y = 0.6
  stamenGroup.add(stigma)
  stamenGroup.scale.setScalar(0.82)
  group.add(stamenGroup)

  let bloom = 0
  function setBloom(t) {
    bloom = THREE.MathUtils.clamp(t, 0, 1)
    // cada tepalo abre un pelin distinto (bias) -> apertura mas natural
    for (const m of tepalMeshes) {
      m.morphTargetInfluences[0] = Math.min(1, bloom * m.userData.bloomBias)
    }
    // color segun apertura: capullo verdoso -> color pleno al abrir
    const k = THREE.MathUtils.smoothstep(bloom, 0.08, 0.5)
    petalMaterial.color.lerpColors(BUD_TINT, OPEN_TINT, k)
    // los estambres solo se ven cuando la flor ya esta bastante abierta
    stamenGroup.visible = bloom > 0.35
    const s = THREE.MathUtils.clamp((bloom - 0.35) / 0.65, 0, 1)
    stamenGroup.scale.setScalar(0.82 * (0.6 + s * 0.4))
  }
  setBloom(0)

  return {
    group,
    meshes: tepalMeshes,
    tepalMeshes,
    stamenGroup,
    setBloom,
    get bloom() {
      return bloom
    }
  }
}

export const LILY_DEFAULTS = {
  color: '#f2a0c4',
  throat: '#e6f0c2',
  presets: [
    '#f2a0c4', '#f7c8dc', '#e56b9a', '#c85a86',
    '#ffffff', '#ffd27a', '#ff9d5c', '#ff6f6f',
    '#c86bff', '#8fb3ff', '#b6f5c2', '#ffe08a'
  ]
}

export function disposeSharedLily() {
  if (sharedTepalGeo) {
    sharedTepalGeo.dispose()
    sharedTepalGeo = null
  }
}
