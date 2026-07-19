import * as THREE from 'three'

/*
 * Orquidea mariposa (Phalaenopsis) procedural.
 * - Cara PLANA y redonda: 5 segmentos anchos (3 sepalos + 2 petalos "alas").
 * - Centro con LABIO (labellum) trilobulado amarillo con vetas rojas + COLUMNA.
 * - Cerrado = capullo redondeado; abierto = cara plana.
 */

const U = 16
const V = 12
const LENGTH = 1.55
const MAX_WIDTH = 0.9
const BASE_RADIUS = 0.14
const rad = (d) => (d * Math.PI) / 180

function segAngle(u, open) {
  // abierto: casi horizontal (cara plana) hasta ~84 grados
  if (open) return rad(22 + 62 * Math.pow(u, 0.95))
  // cerrado: segmentos plegados hacia dentro (capullo)
  return rad(6 - 22 * u)
}
function smooth01(x) {
  x = Math.max(0, Math.min(1, x))
  return x * x * (3 - 2 * x)
}
function segWidth(u) {
  // espatulado: base estrecha, MUY ancho arriba, punta redondeada
  const body = Math.pow(Math.sin(Math.PI * (0.08 + 0.84 * u)), 0.42)
  return MAX_WIDTH * body * smooth01(u / 0.1)
}

function buildPositions(open) {
  const positions = []
  const uvs = []
  const cy = [0]
  const cz = [BASE_RADIUS]
  const ds = LENGTH / U
  for (let i = 1; i <= U; i++) {
    const uMid = (i - 0.5) / U
    const th = segAngle(uMid, open)
    cy.push(cy[i - 1] + Math.cos(th) * ds)
    cz.push(cz[i - 1] + Math.sin(th) * ds)
  }
  const channel = open ? 0.06 : 0.34 // casi plano abierto; plegado cerrado
  for (let i = 0; i <= U; i++) {
    const u = i / U
    const w = segWidth(u)
    const iN = Math.min(i, U - 1)
    const dy = cy[iN + 1] - cy[iN]
    const dz = cz[iN + 1] - cz[iN]
    const tl = Math.hypot(dy, dz) || 1
    const ny = dz / tl
    const nz = -dy / tl
    for (let j = 0; j <= V; j++) {
      const v = (j / V) * 2 - 1
      const cup = channel * (v * v) * w
      positions.push(v * w, cy[i] + ny * cup, cz[i] + nz * cup)
      uvs.push((v + 1) / 2, u)
    }
  }
  return { positions, uvs }
}

function buildGeometry() {
  const closed = buildPositions(false)
  const open = buildPositions(true)
  const geo = new THREE.BufferGeometry()
  geo.setAttribute('position', new THREE.Float32BufferAttribute(closed.positions, 3))
  geo.setAttribute('uv', new THREE.Float32BufferAttribute(closed.uvs, 2))
  const indices = []
  const stride = V + 1
  for (let i = 0; i < U; i++) {
    for (let j = 0; j < V; j++) {
      const a = i * stride + j
      indices.push(a, a + stride, a + 1, a + 1, a + stride, a + stride + 1)
    }
  }
  geo.setIndex(indices)
  geo.computeVertexNormals()
  const openGeo = new THREE.BufferGeometry()
  openGeo.setAttribute('position', new THREE.Float32BufferAttribute(open.positions, 3))
  openGeo.setIndex(indices)
  openGeo.computeVertexNormals()
  geo.morphAttributes.position = [openGeo.getAttribute('position').clone()]
  geo.morphAttributes.normal = [openGeo.getAttribute('normal').clone()]
  openGeo.dispose()
  return geo
}

let sharedGeo = null
function getGeometry() {
  if (!sharedGeo) sharedGeo = buildGeometry()
  return sharedGeo
}

function hash(n) {
  const x = Math.sin(n * 127.1 + 311.7) * 43758.5453
  return x - Math.floor(x)
}

// Textura: color base con venas radiales muy sutiles (en blanco queda liso)
export function makeOrchidTexture(baseHex = '#ffffff') {
  const c = document.createElement('canvas')
  c.width = 256
  c.height = 512
  const ctx = c.getContext('2d')
  ctx.fillStyle = baseHex
  ctx.fillRect(0, 0, c.width, c.height)
  ctx.strokeStyle = 'rgba(150,150,170,0.10)'
  ctx.lineWidth = 1.5
  for (let k = -2; k <= 2; k++) {
    ctx.beginPath()
    ctx.moveTo(c.width / 2 + k * 22, c.height)
    ctx.quadraticCurveTo(c.width / 2 + k * 40, c.height * 0.4, c.width / 2 + k * 30, 0)
    ctx.stroke()
  }
  // base un pelin mas calida
  const g = ctx.createLinearGradient(0, c.height, 0, c.height * 0.7)
  g.addColorStop(0, 'rgba(245,240,210,0.5)')
  g.addColorStop(1, 'rgba(255,255,255,0)')
  ctx.fillStyle = g
  ctx.fillRect(0, c.height * 0.7, c.width, c.height * 0.3)
  const tex = new THREE.CanvasTexture(c)
  tex.colorSpace = THREE.SRGBColorSpace
  tex.anisotropy = 4
  return tex
}

const BUD_TINT = new THREE.Color('#c7d3a4')
const OPEN_TINT = new THREE.Color('#ffffff')

export const ORCHID_DEFAULTS = {
  color: '#ffffff',
  presets: ['#ffffff', '#d94fa0', '#a05fd6', '#ff9ec7', '#f2d43a', '#c9a0ff']
}

// 3 sepalos + 2 petalos (alas); los petalos, mas anchos y adyacentes al dorsal
const SEGMENTS = [
  { rot: 0, wx: 0.95, wy: 0.98 }, // sepalo dorsal (arriba)
  { rot: 70, wx: 1.3, wy: 1.05 }, // petalo (ala)
  { rot: 290, wx: 1.3, wy: 1.05 }, // petalo (ala)
  { rot: 145, wx: 1.02, wy: 0.95 }, // sepalo lateral
  { rot: 215, wx: 1.02, wy: 0.95 } // sepalo lateral
]

export function createOrchid({ petalMaterial, seed = 0 }) {
  const group = new THREE.Group()
  const meshes = []
  const geo = getGeometry()

  SEGMENTS.forEach((s, i) => {
    const mesh = new THREE.Mesh(geo, petalMaterial)
    mesh.castShadow = true
    mesh.rotation.y = rad(s.rot) + (hash(seed * 6 + i) - 0.5) * 0.06
    mesh.rotation.x = (hash(seed * 13 + i) - 0.5) * 0.05
    mesh.scale.x = s.wx
    mesh.scale.y = s.wy
    mesh.updateMorphTargets()
    mesh.userData.bloomBias = 0.94 + hash(seed * 31 + i) * 0.1
    mesh.morphTargetInfluences[0] = 0
    mesh.userData.isPetal = true
    group.add(mesh)
    meshes.push(mesh)
  })

  // --- Labio (labellum) + columna en el centro (la firma de la orquidea) ---
  const lipGroup = new THREE.Group()
  const lipYellow = new THREE.MeshStandardMaterial({ color: 0xf2c23a, roughness: 0.5 })
  const lipMagenta = new THREE.MeshStandardMaterial({ color: 0xc23a86, roughness: 0.5 })
  const columnMat = new THREE.MeshStandardMaterial({ color: 0xf7f0e0, roughness: 0.5 })
  const redMat = new THREE.MeshStandardMaterial({ color: 0x9a1030, roughness: 0.5 })

  // columna (curva palida, apunta al frente-arriba)
  const column = new THREE.Mesh(new THREE.CapsuleGeometry(0.11, 0.24, 5, 10), columnMat)
  column.position.set(0, 0.42, 0.16)
  column.rotation.x = 0.5
  lipGroup.add(column)

  // lobulo medio del labio (amarillo, plataforma prominente hacia el frente)
  const midLobe = new THREE.Mesh(new THREE.SphereGeometry(0.22, 14, 12), lipYellow)
  midLobe.position.set(0, 0.1, 0.5)
  midLobe.scale.set(1.1, 0.45, 1.5)
  lipGroup.add(midLobe)
  // "antenas" del lobulo medio (rasgo del labio)
  for (const sx of [-1, 1]) {
    const ant = new THREE.Mesh(new THREE.CapsuleGeometry(0.022, 0.2, 4, 8), lipYellow)
    ant.position.set(sx * 0.1, 0.22, 0.72)
    ant.rotation.z = sx * 0.4
    ant.rotation.x = -0.6
    lipGroup.add(ant)
  }
  // lobulos laterales (magenta, erguidos flanqueando la columna)
  for (const sx of [-1, 1]) {
    const side = new THREE.Mesh(new THREE.SphereGeometry(0.15, 12, 10), lipMagenta)
    side.position.set(sx * 0.24, 0.4, 0.24)
    side.scale.set(0.7, 1.3, 0.7)
    lipGroup.add(side)
  }
  // pecas rojas sobre el amarillo
  for (const [dx, dy, dz] of [[0, 0.2, 0.62], [-0.09, 0.12, 0.5], [0.09, 0.12, 0.5], [0, 0.08, 0.42]]) {
    const dot = new THREE.Mesh(new THREE.SphereGeometry(0.035, 8, 8), redMat)
    dot.position.set(dx, dy, dz)
    lipGroup.add(dot)
  }
  group.add(lipGroup)

  let bloom = 0
  function setBloom(t) {
    bloom = THREE.MathUtils.clamp(t, 0, 1)
    for (const m of meshes) m.morphTargetInfluences[0] = Math.min(1, bloom * m.userData.bloomBias)
    const k = THREE.MathUtils.smoothstep(bloom, 0.08, 0.5)
    petalMaterial.color.lerpColors(BUD_TINT, OPEN_TINT, k)
    lipGroup.visible = bloom > 0.35
    const s = THREE.MathUtils.clamp((bloom - 0.35) / 0.65, 0, 1)
    lipGroup.scale.setScalar(0.6 + s * 0.4)
  }
  setBloom(0)

  return {
    group,
    meshes,
    setBloom,
    get bloom() {
      return bloom
    }
  }
}
