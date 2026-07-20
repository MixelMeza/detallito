import * as THREE from 'three'

/*
 * Orquidea mariposa (Phalaenopsis) procedural.
 * - Cara PLANA y redonda: 5 segmentos anchos (3 sepalos + 2 petalos "alas").
 * - Centro con LABIO (labellum) trilobulado amarillo con vetas rojas + COLUMNA.
 * - Cerrado = capullo redondeado; abierto = cara plana.
 */

const U = 16
const V = 16
const LENGTH = 1.5
const MAX_WIDTH = 1.08
const BASE_RADIUS = 0.1
const rad = (d) => (d * Math.PI) / 180

function segAngle(u, open) {
  // abierto: cara plana con una leve curvatura hacia el frente (~78 grados)
  if (open) return rad(20 + 58 * Math.pow(u, 0.92))
  // cerrado: TEARDROP alargado -> panza baja y cierra en punta suave arriba
  return rad(27 * Math.cos(Math.PI * Math.min(u * 0.96, 1)))
}
function smooth01(x) {
  x = Math.max(0, Math.min(1, x))
  return x * x * (3 - 2 * x)
}
function segWidth(u) {
  // OVALO ancho (moth orchid): garra en la base, cuerpo ancho, punta redondeada.
  // Distintos (no una bola esponjada) pero solapando un poco.
  const body = Math.pow(Math.sin(Math.PI * (0.06 + 0.88 * u)), 0.42)
  return MAX_WIDTH * body * smooth01(u / 0.08)
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
  const channel = open ? 0.05 : 0.52 // cara PLANA abierta (moth orchid); envuelve el capullo
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
  // venas radiales finas mas visibles (dan cuerpo al petalo)
  ctx.strokeStyle = 'rgba(120,120,140,0.16)'
  ctx.lineWidth = 1.6
  for (let k = -4; k <= 4; k++) {
    ctx.beginPath()
    ctx.moveTo(c.width / 2 + k * 12, c.height)
    ctx.quadraticCurveTo(c.width / 2 + k * 30, c.height * 0.45, c.width / 2 + k * 24, 0)
    ctx.stroke()
  }
  // leve sombreado en los bordes (menos aspecto plano/transparente)
  const vg = ctx.createLinearGradient(0, 0, c.width, 0)
  vg.addColorStop(0, 'rgba(60,60,80,0.16)')
  vg.addColorStop(0.5, 'rgba(255,255,255,0)')
  vg.addColorStop(1, 'rgba(60,60,80,0.16)')
  ctx.fillStyle = vg
  ctx.fillRect(0, 0, c.width, c.height)
  // base un pelin mas calida
  const g = ctx.createLinearGradient(0, c.height, 0, c.height * 0.7)
  g.addColorStop(0, 'rgba(245,240,210,0.5)')
  g.addColorStop(1, 'rgba(255,255,255,0)')
  ctx.fillStyle = g
  ctx.fillRect(0, c.height * 0.7, c.width, c.height * 0.3)
  // pecas magenta cerca de la base-centro (garganta manchada tipica)
  ctx.fillStyle = 'rgba(190,40,120,0.5)'
  const spots = [
    [0.5, 0.9, 4], [0.44, 0.86, 3], [0.56, 0.86, 3], [0.48, 0.82, 3],
    [0.53, 0.82, 3], [0.5, 0.78, 3], [0.42, 0.9, 2], [0.58, 0.9, 2]
  ]
  spots.forEach(([sx, sy, r]) => {
    ctx.beginPath()
    ctx.ellipse(sx * c.width, sy * c.height, r, r * 1.4, 0, 0, Math.PI * 2)
    ctx.fill()
  })
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
  { rot: 0, wx: 0.98, wy: 1.02, ph: 0.0 }, // sepalo dorsal (arriba)
  { rot: 66, wx: 1.28, wy: 1.05, ph: 0.16 }, // petalo (ala/mejilla)
  { rot: 294, wx: 1.28, wy: 1.05, ph: 0.16 }, // petalo (ala/mejilla)
  { rot: 140, wx: 1.02, wy: 0.98, ph: 0.08 }, // sepalo lateral
  { rot: 220, wx: 1.02, wy: 0.98, ph: 0.08 } // sepalo lateral
]

export function createOrchid({ petalMaterial, seed = 0 }) {
  const group = new THREE.Group()
  const meshes = []
  const geo = getGeometry()

  // La CARA plana (5 segmentos) va en su propio grupo: emerge del capullo.
  const faceGroup = new THREE.Group()
  SEGMENTS.forEach((s, i) => {
    const mesh = new THREE.Mesh(geo, petalMaterial)
    mesh.castShadow = true
    mesh.rotation.y = rad(s.rot) + (hash(seed * 6 + i) - 0.5) * 0.06
    mesh.rotation.x = (hash(seed * 13 + i) - 0.5) * 0.05
    mesh.scale.x = s.wx
    mesh.scale.y = s.wy
    mesh.updateMorphTargets()
    mesh.userData.bloomBias = 0.94 + hash(seed * 31 + i) * 0.1
    mesh.userData.phase = s.ph + hash(seed * 41 + i) * 0.05
    mesh.morphTargetInfluences[0] = 0
    mesh.userData.isPetal = true
    faceGroup.add(mesh)
    meshes.push(mesh)
  })
  group.add(faceGroup)

  // CAPULLO teardrop (malla aparte): limpio y realista cuando esta cerrado;
  // se encoge al abrir mientras la cara emerge. (Un petalo plano ancho no
  // pliega bien en capullo -> por eso el capullo es una pieza propia.)
  const budProfile = [
    [0.0, 0.0], [0.15, 0.12], [0.24, 0.38], [0.26, 0.66],
    [0.2, 0.96], [0.1, 1.24], [0.0, 1.4]
  ].map(([x, y]) => new THREE.Vector2(x, y))
  const budMesh = new THREE.Mesh(
    new THREE.LatheGeometry(budProfile, 22),
    new THREE.MeshStandardMaterial({ color: 0xcdd8ad, roughness: 0.55 })
  )
  budMesh.castShadow = true
  group.add(budMesh)

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
  faceGroup.add(lipGroup)

  let bloom = 0
  function setBloom(t) {
    bloom = THREE.MathUtils.clamp(t, 0, 1)
    // capullo: lleno cerrado, se encoge al abrir
    const budK = 1 - THREE.MathUtils.smoothstep(bloom, 0.05, 0.42)
    budMesh.visible = budK > 0.02
    budMesh.scale.setScalar(Math.max(0.001, budK))
    // la cara emerge del capullo y se abre
    const faceK = THREE.MathUtils.smoothstep(bloom, 0.16, 0.62)
    faceGroup.visible = faceK > 0.02
    faceGroup.scale.setScalar(Math.max(0.001, faceK))
    for (const m of meshes) {
      let e = (bloom - m.userData.phase) / Math.max(0.001, 1 - m.userData.phase)
      e = THREE.MathUtils.clamp(e, 0, 1)
      e = e * e * (3 - 2 * e)
      m.morphTargetInfluences[0] = Math.min(1, e * m.userData.bloomBias)
    }
    const k = THREE.MathUtils.smoothstep(bloom, 0.3, 0.6)
    petalMaterial.color.lerpColors(BUD_TINT, OPEN_TINT, k)
    // el labio (la firma) emerge al final, cuando la cara ya se abrio
    lipGroup.visible = bloom > 0.55
    const s = THREE.MathUtils.clamp((bloom - 0.55) / 0.45, 0, 1)
    lipGroup.scale.setScalar(0.5 + s * s * (3 - 2 * s) * 0.5)
  }
  setBloom(0)

  return {
    group,
    // para raycasting: segmentos + el capullo (asi se puede tocar cerrado)
    meshes: [...meshes, budMesh],
    setBloom,
    get bloom() {
      return bloom
    }
  }
}
