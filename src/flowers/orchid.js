import * as THREE from 'three'

/*
 * Orquidea mariposa (Phalaenopsis) procedural.
 * - Cara PLANA y redonda: 5 segmentos anchos (3 sepalos + 2 petalos "alas").
 * - Centro con LABIO (labellum) trilobulado amarillo con vetas rojas + COLUMNA.
 * - Cerrado = capullo redondeado; abierto = cara plana.
 */

const U = 16
const V = 16
const LENGTH = 1.6
const MAX_WIDTH = 0.66 // ANGOSTO -> los 5 tepalos se SEPARAN de verdad (estrella, con hueco abajo)
const BASE_RADIUS = 0.11 // tepalos casi se juntan al centro -> hueco minimo (el labio va delante)
const rad = (d) => (d * Math.PI) / 180

function segAngle(u, open) {
  // abierto: el tepalo sube casi de cara y la PUNTA RECURVA un poco hacia atras
  // -> la cara no es un disco plano, tiene relieve/profundidad.
  if (open) return rad(66 + 30 * smooth01((u - 0.45) / 0.55))
  // cerrado: TEARDROP alargado -> panza baja y cierra en punta suave arriba
  return rad(27 * Math.cos(Math.PI * Math.min(u * 0.96, 1)))
}
function smooth01(x) {
  x = Math.max(0, Math.min(1, x))
  return x * x * (3 - 2 * x)
}
function segWidth(u) {
  // petalo ancho en el medio que se afina a PUNTA (ovado-lanceolado, como el
  // tepalo del Cymbidium) -> 5 tepalos DISTINTOS y puntiagudos, no un disco.
  const rise = smooth01(u / 0.14)
  const taper = 1 - 0.82 * smooth01((u - 0.42) / 0.58)
  return MAX_WIDTH * rise * taper
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
  const channel = open ? 0.24 : 0.52 // ACOPADO (no lamina plana) -> da profundidad
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
  // venas longitudinales marcadas (rasgo del Cymbidium): lineas oscuras que
  // irradian desde la base -> definen el petalo (no un borron liso)
  ctx.strokeStyle = 'rgba(70,40,60,0.28)'
  ctx.lineWidth = 1.8
  for (let k = -5; k <= 5; k++) {
    ctx.beginPath()
    ctx.moveTo(c.width / 2 + k * 8, c.height)
    ctx.quadraticCurveTo(c.width / 2 + k * 26, c.height * 0.45, c.width / 2 + k * 22, 0)
    ctx.stroke()
  }
  // base un pelin mas calida (SUAVE -> sin glow blanco que lave el centro)
  const g = ctx.createLinearGradient(0, c.height, 0, c.height * 0.82)
  g.addColorStop(0, 'rgba(240,225,200,0.2)')
  g.addColorStop(1, 'rgba(255,255,255,0)')
  ctx.fillStyle = g
  ctx.fillRect(0, c.height * 0.82, c.width, c.height * 0.18)
  // MOTEADO tipo Vanda (tesela): puntos oscuros del color, mas grandes y densos
  // hacia la BASE/centro (abajo) -> textura y PROFUNDIDAD (no un liso plano).
  for (let gy = 2; gy <= 21; gy++) {
    const y = (gy / 22) * c.height
    const fb = gy / 22 // 0 punta (arriba) -> 1 base/centro (abajo)
    const step = 22
    const off = (gy % 2) * (step / 2) // filas alternadas -> tesela
    for (let x = -step; x <= c.width + step; x += step) {
      const size = 2.5 + 7 * fb * fb
      const a = 0.1 + 0.42 * fb
      ctx.fillStyle = `rgba(80,16,62,${a})`
      ctx.beginPath()
      ctx.ellipse(x + off, y, size, size * 0.92, 0, 0, Math.PI * 2)
      ctx.fill()
    }
  }

  // BORDE BLANCO suave del petalo (lados = bordes del tepalo, y la PUNTA arriba)
  // -> el color queda "coloreado" al centro con margen blanco, como la Phalaenopsis.
  const edge = ctx.createLinearGradient(0, 0, c.width, 0)
  edge.addColorStop(0.0, 'rgba(255,255,255,0.95)')
  edge.addColorStop(0.16, 'rgba(255,255,255,0)')
  edge.addColorStop(0.84, 'rgba(255,255,255,0)')
  edge.addColorStop(1.0, 'rgba(255,255,255,0.95)')
  ctx.fillStyle = edge
  ctx.fillRect(0, 0, c.width, c.height)
  const tipEdge = ctx.createLinearGradient(0, 0, 0, c.height * 0.22)
  tipEdge.addColorStop(0, 'rgba(255,255,255,0.9)') // punta (arriba del canvas)
  tipEdge.addColorStop(1, 'rgba(255,255,255,0)')
  ctx.fillStyle = tipEdge
  ctx.fillRect(0, 0, c.width, c.height * 0.22)

  const tex = new THREE.CanvasTexture(c)
  tex.colorSpace = THREE.SRGBColorSpace
  tex.anisotropy = 4
  return tex
}

// Textura del LABIO (labellum): silueta trilobulada, base BLANCA, garganta
// AMARILLA, manchas y rayas GRANATE + borde granate. Fondo transparente
// (alphaTest recorta la silueta). Es la firma visual de la orquidea.
let sharedLipTex = null
function makeLipTexture() {
  if (sharedLipTex) return sharedLipTex
  const c = document.createElement('canvas')
  c.width = 256
  c.height = 256
  const ctx = c.getContext('2d')
  ctx.clearRect(0, 0, 256, 256)
  // silueta trilobulada (arriba = lado columna, angosto; abajo = lobulo medio, ancho)
  const p = new Path2D()
  p.moveTo(128, 34)
  p.bezierCurveTo(176, 40, 208, 78, 202, 120)
  p.bezierCurveTo(198, 168, 172, 214, 128, 240)
  p.bezierCurveTo(84, 214, 58, 168, 54, 120)
  p.bezierCurveTo(48, 78, 80, 40, 128, 34)
  p.closePath()
  ctx.save()
  ctx.clip(p)
  ctx.fillStyle = '#fbf7f2' // blanco crema
  ctx.fillRect(0, 0, 256, 256)
  // garganta AMARILLA central (dos crestas) hacia el lado columna
  const yth = ctx.createLinearGradient(0, 40, 0, 200)
  yth.addColorStop(0, 'rgba(245,200,60,0.95)')
  yth.addColorStop(0.7, 'rgba(245,205,70,0.85)')
  yth.addColorStop(1, 'rgba(245,210,90,0)')
  ctx.fillStyle = yth
  ctx.fillRect(104, 40, 48, 150)
  // linea central granate sobre el amarillo
  ctx.fillStyle = 'rgba(120,16,52,0.9)'
  ctx.fillRect(123, 60, 10, 120)
  // manchas/squiggles GRANATE en los lobulos laterales (izq y der)
  ctx.fillStyle = 'rgba(120,16,52,0.92)'
  const blobs = [
    [80, 100, 10, 7], [92, 128, 12, 8], [78, 150, 9, 7], [96, 172, 11, 7],
    [176, 100, 10, 7], [164, 128, 12, 8], [178, 150, 9, 7], [160, 172, 11, 7],
    [110, 205, 9, 6], [146, 205, 9, 6], [128, 220, 12, 7]
  ]
  blobs.forEach(([x, y, rx, ry]) => {
    ctx.beginPath()
    ctx.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2)
    ctx.fill()
  })
  // borde GRANATE (margen del labio)
  ctx.lineWidth = 18
  ctx.strokeStyle = '#6e0f2b'
  ctx.stroke(p)
  ctx.restore()
  const tex = new THREE.CanvasTexture(c)
  tex.colorSpace = THREE.SRGBColorSpace
  tex.anisotropy = 4
  sharedLipTex = tex
  return tex
}

const BUD_TINT = new THREE.Color('#c7d3a4')
const OPEN_TINT = new THREE.Color('#ffffff')

export const ORCHID_DEFAULTS = {
  color: '#df57a4', // ROSADO/fucsia por defecto (como la Phalaenopsis)
  presets: ['#df57a4', '#ffffff', '#a05fd6', '#ff9ec7', '#f2d43a', '#c9a0ff'],
  sizeScale: 0.72, // mas pequeñas -> caben MAS y juntas sin atravesarse
  // ramo DENSO (como el tulipan): radio de colision y alcance cortos; se rozan
  // pero no se atraviesan
  radiusFactor: 1.4,
  maxR: 1.6
}

// 3 sepalos + 2 petalos (alas); los petalos, mas anchos y adyacentes al dorsal
// Arreglo ASIMETRICO tipo moth orchid: el LABIO ocupa el hueco de abajo (rot 0),
// los 2 sepalos inferiores lo flanquean bien separados, los 2 petalos-ala arriba
// a los lados, y el sepalo dorsal opuesto al labio (arriba).
const SEGMENTS = [
  { rot: 180, wx: 1.02, wy: 1.06, ph: 0.0 }, // sepalo dorsal (arriba)
  { rot: 116, wx: 1.34, wy: 1.06, ph: 0.16 }, // petalo (ala) sup izq
  { rot: 244, wx: 1.34, wy: 1.06, ph: 0.16 }, // petalo (ala) sup der
  { rot: 62, wx: 1.06, wy: 1.0, ph: 0.08 }, // sepalo inferior izq (flanquea labio)
  { rot: 298, wx: 1.06, wy: 1.0, ph: 0.08 } // sepalo inferior der (flanquea labio)
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

  // GARGANTA: disco MINIMO y plano que solo tapa el huequito central (los
  // tepalos casi se juntan). Pequeño y detras del labio -> no asoma como aro/bola.
  const throat = new THREE.Mesh(
    new THREE.CircleGeometry(0.17, 20),
    new THREE.MeshStandardMaterial({ color: 0x7a1a3c, roughness: 0.6, side: THREE.DoubleSide })
  )
  throat.rotation.x = -Math.PI / 2 // de cara al visor (queda de canto desde los lados)
  throat.position.set(0, -0.02, 0.04)
  faceGroup.add(throat)

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
  // adelantado hacia el visor -> el labio va POR DELANTE de los tepalos acopados
  // (no lo tapan/parten por el medio)
  lipGroup.position.set(0, 0.34, 0)

  // LABIO: plano curvado con TEXTURA (blanco/amarillo/granate), mira al visor.
  const lipMat = new THREE.MeshStandardMaterial({
    map: makeLipTexture(),
    transparent: true,
    alphaTest: 0.5,
    side: THREE.DoubleSide,
    roughness: 0.55
  })
  const lipGeo = new THREE.PlaneGeometry(1.3, 1.45, 12, 14)
  // curl SUAVE: solo el borde frontal (y negativo) se dobla un poco hacia el
  // visor, sin dejar de estar de cara (el labio real cae/ondula al frente)
  const lp = lipGeo.attributes.position
  for (let i = 0; i < lp.count; i++) {
    const front = Math.max(0, -lp.getY(i) / 0.725) // 0 atras -> 1 frente
    lp.setZ(i, lp.getZ(i) + 0.12 * front * front)
  }
  lipGeo.computeVertexNormals()
  const lip = new THREE.Mesh(lipGeo, lipMat)
  lip.position.set(0, 0.02, 0.44) // cuelga en el hueco de abajo
  lip.rotation.x = -Math.PI / 2 // DE CARA al visor (normal = +Y de la flor)
  lip.scale.setScalar(1.0) // grande y visible (la firma), ~2/3 de un tepalo
  lipGroup.add(lip)

  // COLUMNA: capuchon PEQUEÑO magenta encima del labio + capuchon de antera BLANCO
  const columnMat = new THREE.MeshStandardMaterial({ color: 0x9c2a63, roughness: 0.5 })
  const capMat = new THREE.MeshStandardMaterial({ color: 0xf7f2ea, roughness: 0.45 })
  const column = new THREE.Mesh(new THREE.CapsuleGeometry(0.06, 0.16, 6, 12), columnMat)
  column.position.set(0, 0.12, 0.24) // sobre el borde superior del labio
  column.rotation.x = 1.35 // arquea hacia abajo, sobre la garganta
  lipGroup.add(column)
  const antherCap = new THREE.Mesh(new THREE.SphereGeometry(0.055, 12, 10), capMat)
  antherCap.position.set(0, 0.06, 0.33) // punta blanca de la columna (en la garganta)
  antherCap.scale.set(1.3, 0.8, 1)
  lipGroup.add(antherCap)

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
