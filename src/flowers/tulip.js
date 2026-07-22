import * as THREE from 'three'

/*
 * Tulipan (Tulipa) procedural.
 * - 6 tepalos anchos y OBOVADOS (punta redondeada), fuertemente ACUCHARADOS,
 *   en 2 verticilos de 3.
 * - Cerrado = copa/huevo; abierto = cuenco/estrella (NO recurva como el lirio).
 * - Centro: 6 estambres cortos con anteras OSCURAS (casi negras) + estigma
 *   trilobulado palido. Mancha basal oscura en la textura.
 */

const U = 28
const V = 20
const LENGTH = 1.95 // alto de la flor. Con MAXR 0.54 -> ratio ~1.8:1 (ESBELTO)
const BASE_RADIUS = 0.05
const MAXR = 0.54 // mas ESBELTO (goblet slim, como el tulipan rosa real)
// exponentes del huevo CERRADO: base estrecha (A) y hombros llenos + cima con
// punta SUAVE (B algo mayor -> las puntas convergen, no un domo tan romo)
const EGG_A = 0.72
const EGG_B = 0.54
// ABIERTO (florecido): mas ANCHO que el capullo, pero los tepalos terminan en
// PUNTA SUAVE (como el dibujo), no en domo romo. B algo mayor = mas punta.
const OPEN_A = 0.62
const OPEN_B = 0.5
const OPEN_WIDE = 1.12
const rad = (d) => (d * Math.PI) / 180

function smooth01(x) {
  x = Math.max(0, Math.min(1, x))
  return x * x * (3 - 2 * x)
}

// Media anchura ANGULAR del tepalo (rad). El tulipan tiene 6 tepalos; con
// ~32 grados de medio-ancho (0.56 rad) los 6 se SOLAPAN (6*2*32=384>360) y
// cierran la superficie -> sin muescas/dientes en la cima.
// medio-ancho angular por estado. Abierto usa MAS ancho para que la copa siga
// LLENA (tepalos solapados, borde apenas ondulado) en vez de dientes separados.
// SOLAPE FUERTE en ambos estados: 6 tepalos * 2 * ~41 grados = 492 > 360 -> se
// solapan de sobra y NUNCA dejan huecos/cuñas blancas (ese era el gran defecto).
// CERRADO: solape fuerte (sin huecos, huevo liso). ABIERTO: algo mas estrecho
// para que las puntas se SEPAREN al evertirse (se ve el centro), pero el interior
// ahora es de color saturado -> las separaciones muestran color, no cuñas blancas.
// Ambos con solape fuerte en el CUERPO. En el abierto los tepalos se AFINAN
// arriba -> se SEPARAN SOLO en el tercio superior (el cuerpo sigue unido/lleno)
// y cada punta queda REDONDEADA como una cuchara.
// Ambos con tepalos ANCHOS y solapados. Abierto solo un pelin mas estrecho ->
// borde superior con FESTON suave (lobulos anchos y REDONDEADOS), NUNCA puas.
const ALPHA_CLOSED = 0.72
const ALPHA_OPEN = 0.64
function tepalWidth(u, open) {
  const rise = smooth01(u / 0.12) // nace estrecho del receptaculo
  // abierto: ancho en el cuerpo y afina a PUNTA SUAVE (arco de hoja) arriba,
  // como en el dibujo -> tepalos definidos que rematan en punta, no en domo.
  if (open) return rise * (1 - 0.55 * smooth01((u - 0.5) / 0.5))
  return rise * (1 - 0.1 * smooth01((u - 0.62) / 0.38))
}

// Meridiano (radio, altura) del tepalo. CLAVE del arreglo: la CIMA es
// REDONDEADA (perfil tipo raiz cuadrada -> domo, como el top de un circulo),
// NUNCA una punta afilada. Antes se integraba un angulo que formaba un cono.
function normOf(a, b) {
  let m = 1e-6
  for (let i = 0; i <= 200; i++) {
    const u = i / 200
    const r = Math.pow(u, a) * Math.pow(1 - u, b)
    if (r > m) m = r
  }
  return m
}
const CLOSED_NORM = normOf(EGG_A, EGG_B)
const OPEN_NORM = normOf(OPEN_A, OPEN_B)
function meridian(u, open) {
  const y = LENGTH * u
  // HUEVO rechoncho: base estrecha, hombros LLENOS en el tercio superior, y CIMA
  // ROMA/redondeada. (1-u)^0.45 dobla el perfil en domo arriba (nunca punta).
  const egg = (MAXR * Math.pow(u, EGG_A) * Math.pow(1 - u, EGG_B)) / CLOSED_NORM
  if (!open) return { r: Math.max(BASE_RADIUS, egg), y }
  // ABIERTO = copa LLENA y REDONDA (florecida): mas ancha que el capullo, con
  // CORONA REDONDA. La cima no converge a punta: se queda ANCHA (los tepalos
  // anchos y redondeados forman el borde). Puntas apenas hacia afuera-arriba.
  const fuller = (MAXR * OPEN_WIDE * Math.pow(u, OPEN_A) * Math.pow(1 - u, OPEN_B)) / OPEN_NORM
  const crown = MAXR * 0.24 * smooth01(u / 0.9) // arriba no cierra del todo (punta suave)
  const tipUp = 0.12 * smooth01((u - 0.7) / 0.3) // las puntas se elevan un poco
  return { r: Math.max(BASE_RADIUS, Math.max(fuller, crown)), y: y + tipUp }
}

function buildPositions(open) {
  const positions = []
  const uvs = []
  for (let i = 0; i <= U; i++) {
    const u = i / U
    const { r, y } = meridian(u, open)
    const alpha = (open ? ALPHA_OPEN : ALPHA_CLOSED) * tepalWidth(u, open)
    // cada fila se ENVUELVE en un arco de radio r -> el tepalo es un trozo de la
    // superficie de la copa/huevo (no una lamina plana)
    for (let j = 0; j <= V; j++) {
      const v = (j / V) * 2 - 1
      const th = v * alpha
      positions.push(r * Math.sin(th), y, r * Math.cos(th))
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

// hex "#rrggbb" -> "rgba(r,g,b,a)" (para degradados con el color del petalo)
function hexA(hex, a) {
  const h = hex.replace('#', '')
  const r = parseInt(h.substring(0, 2), 16)
  const g = parseInt(h.substring(2, 4), 16)
  const b = parseInt(h.substring(4, 6), 16)
  return `rgba(${r},${g},${b},${a})`
}

// Textura: tepalo de color pleno + MANCHA BASAL oscura (rasgo del tulipan)
export function makeTulipTexture(baseHex = '#d42a2a') {
  const c = document.createElement('canvas')
  c.width = 256
  c.height = 512
  const ctx = c.getContext('2d')
  ctx.fillStyle = baseHex
  ctx.fillRect(0, 0, c.width, c.height)

  // MODELADO del tepalo a lo ancho: centro abombado (mas claro) y BORDES en
  // sombra -> define cada tepalo redondeado y marca la COSTURA de solape con el
  // vecino. Mas contraste que antes = tepalos mas definidos (menos "globo liso").
  const sheen = ctx.createLinearGradient(0, 0, c.width, 0)
  sheen.addColorStop(0.0, 'rgba(0,0,0,0.34)') // costura (borde del tepalo) en sombra
  sheen.addColorStop(0.12, 'rgba(0,0,0,0.14)')
  sheen.addColorStop(0.5, 'rgba(255,255,255,0.16)') // lomo del tepalo iluminado
  sheen.addColorStop(0.88, 'rgba(0,0,0,0.14)')
  sheen.addColorStop(1.0, 'rgba(0,0,0,0.34)')
  ctx.fillStyle = sheen
  ctx.fillRect(0, 0, c.width, c.height)

  // VENAS longitudinales sutiles (dos a cada lado del lomo) -> textura de petalo
  ctx.strokeStyle = 'rgba(0,0,0,0.06)'
  ctx.lineWidth = 1.5
  for (const fx of [0.3, 0.7]) {
    ctx.beginPath()
    ctx.moveTo(c.width * fx, c.height * 0.06)
    ctx.lineTo(c.width * fx, c.height * 0.92)
    ctx.stroke()
  }

  // DEGRADADO vertical SUTIL: color SATURADO casi entero (como el morado/rojo
  // real); solo el tercio inferior se aclara un POCO (no a blanco). Antes se iba
  // a blanco puro y quedaba lavado -> ese era parte del problema.
  const vgrad = ctx.createLinearGradient(0, 0, 0, c.height)
  vgrad.addColorStop(0, 'rgba(255,255,255,0)') // puntas: color pleno
  vgrad.addColorStop(0.5, 'rgba(255,255,255,0)') // mitad superior pleno
  vgrad.addColorStop(0.74, 'rgba(255,252,248,0.35)') // empieza a aclarar
  vgrad.addColorStop(1, 'rgba(255,251,246,0.78)') // tercio inferior CLARO (crema)
  ctx.fillStyle = vgrad
  ctx.fillRect(0, 0, c.width, c.height)

  // ANILLO AMARILLO + MANCHA basal: rasgos del INTERIOR. Muy CONTENIDOS y BAJOS
  // (bottom ~10%) para que queden ocultos por el receptaculo y NO asomen fuera.
  const cx = c.width / 2
  const cH = c.height
  const ring = ctx.createRadialGradient(cx, cH, cH * 0.01, cx, cH, cH * 0.1)
  ring.addColorStop(0, 'rgba(255,214,64,0.85)')
  ring.addColorStop(0.7, 'rgba(255,204,48,0.5)')
  ring.addColorStop(1, 'rgba(255,204,48,0)')
  ctx.fillStyle = ring
  ctx.fillRect(0, cH * 0.86, c.width, cH * 0.14)
  const blotch = ctx.createRadialGradient(cx, cH * 1.0, 2, cx, cH * 1.0, cH * 0.07)
  blotch.addColorStop(0, 'rgba(16,6,20,0.95)')
  blotch.addColorStop(0.7, 'rgba(26,8,26,0.7)')
  blotch.addColorStop(1, 'rgba(26,8,26,0)')
  ctx.fillStyle = blotch
  ctx.fillRect(0, cH * 0.93, c.width, cH * 0.07)
  // BASE VERDE en el borde inferior (donde el tepalo nace del tallo)
  const greenBase = ctx.createLinearGradient(0, cH, 0, cH * 0.92)
  greenBase.addColorStop(0, 'rgba(110,165,74,0.9)')
  greenBase.addColorStop(1, 'rgba(110,165,74,0)')
  ctx.fillStyle = greenBase
  ctx.fillRect(0, cH * 0.92, c.width, cH * 0.08)

  // ENRIQUECER el color (multiply): la luz/reflejo lavaban el rojo a coral.
  // Multiply con el propio color profundiza la saturacion; en los claros (base
  // palida) casi no hace nada. Se aplica con DEGRADADO (fuerte arriba -> se
  // desvanece hacia la base) para no dejar un escalon visible a media altura.
  ctx.globalCompositeOperation = 'multiply'
  const deep = ctx.createLinearGradient(0, 0, 0, c.height)
  const bh = baseHex
  deep.addColorStop(0, hexA(bh, 0.34))
  deep.addColorStop(0.6, hexA(bh, 0.3))
  deep.addColorStop(0.82, hexA(bh, 0.1))
  deep.addColorStop(1, hexA(bh, 0))
  ctx.fillStyle = deep
  ctx.fillRect(0, 0, c.width, c.height)
  ctx.globalCompositeOperation = 'source-over'

  const tex = new THREE.CanvasTexture(c)
  tex.colorSpace = THREE.SRGBColorSpace
  tex.anisotropy = 4
  return tex
}

// tinte del capullo (cerrado): antes '#c3d29a' oscurecia/apagaba mucho el color
// saturado -> cerrado se veia OSCURO. Ahora es casi blanco (apenas un toque
// verde) para que cerrado conserve su color, solo un pelin mas apagado.
const BUD_TINT = new THREE.Color('#edf0e2')
const OPEN_TINT = new THREE.Color('#ffffff')

export const TULIP_DEFAULTS = {
  color: '#ec5fa2', // ROSADO por defecto
  presets: ['#ec5fa2', '#d42a2a', '#f0a500', '#ffd23f', '#ffffff', '#8e3bd6'],
  sizeScale: 1.25, // un poco mas grandes que lirio/orquidea
  // estrechos -> radio de colision chico y alcance corto = ramo DENSO
  radiusFactor: 1.15,
  maxR: 1.35
}

export function createTulip({ petalMaterial, seed = 0 }) {
  const group = new THREE.Group()
  const meshes = []
  const geo = getGeometry()

  for (let i = 0; i < 6; i++) {
    const mesh = new THREE.Mesh(geo, petalMaterial)
    mesh.castShadow = true
    const inner = i % 2 === 0 // 2 verticilos de 3 (interior/exterior alternados)
    // jitter MINIMO -> borde superior PAREJO (nada de puntas rasgadas)
    mesh.rotation.y = (i / 6) * Math.PI * 2 + (hash(seed * 6 + i) - 0.5) * 0.04
    mesh.rotation.x = (inner ? -0.01 : 0.02) + (hash(seed * 13 + i) - 0.5) * 0.02
    mesh.position.y = inner ? 0.02 : 0
    mesh.scale.y = 0.99 + hash(seed * 23 + i) * 0.03
    mesh.updateMorphTargets()
    mesh.userData.bloomBias = 0.96 + hash(seed * 31 + i) * 0.06
    mesh.userData.phase = (inner ? 0.1 : 0.0) + hash(seed * 41 + i) * 0.05
    mesh.morphTargetInfluences[0] = 0
    mesh.userData.isPetal = true
    group.add(mesh)
    meshes.push(mesh)
  }

  // Centro: 6 estambres cortos con anteras OSCURAS + estigma trilobulado
  const stamenGroup = new THREE.Group()
  const filMat = new THREE.MeshStandardMaterial({ color: 0xe8e2c0, roughness: 0.6 })
  const antherMat = new THREE.MeshStandardMaterial({ color: 0x171018, roughness: 0.5 })
  const antherGeo = new THREE.CapsuleGeometry(0.05, 0.28, 3, 8)
  const filGeo = new THREE.CylinderGeometry(0.02, 0.028, 0.7, 6)
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2
    const r = 0.16
    const fil = new THREE.Mesh(filGeo, filMat)
    fil.position.set(Math.cos(a) * r, 0.45, Math.sin(a) * r)
    fil.rotation.z = -Math.cos(a) * 0.12
    fil.rotation.x = Math.sin(a) * 0.12
    stamenGroup.add(fil)
    const anther = new THREE.Mesh(antherGeo, antherMat)
    anther.position.set(Math.cos(a) * r * 1.15, 0.86, Math.sin(a) * r * 1.15)
    stamenGroup.add(anther)
  }
  // estigma trilobulado palido en el centro
  const stigmaMat = new THREE.MeshStandardMaterial({ color: 0xdfe3a0, roughness: 0.55 })
  const stalk = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.05, 0.7, 8), stigmaMat)
  stalk.position.y = 0.4
  stamenGroup.add(stalk)
  for (let i = 0; i < 3; i++) {
    const a = (i / 3) * Math.PI * 2
    const lobe = new THREE.Mesh(new THREE.SphereGeometry(0.05, 8, 8), stigmaMat)
    lobe.position.set(Math.cos(a) * 0.05, 0.78, Math.sin(a) * 0.05)
    lobe.scale.set(1, 0.6, 1.4)
    lobe.rotation.y = a
    stamenGroup.add(lobe)
  }
  group.add(stamenGroup)

  // receptaculo/ovario verde en la base: los tepalos convergen aqui y se
  // estrecha hacia el tallo -> base limpia (sin hueco ni mancha asomando)
  const recept = new THREE.Mesh(
    new THREE.SphereGeometry(0.11, 14, 12),
    new THREE.MeshStandardMaterial({ color: 0x6faa4a, roughness: 0.6 })
  )
  recept.scale.set(1, 1.7, 1)
  recept.position.y = 0.05
  group.add(recept)

  let bloom = 0
  function setBloom(t) {
    bloom = THREE.MathUtils.clamp(t, 0, 1)
    for (const m of meshes) {
      let e = (bloom - m.userData.phase) / Math.max(0.001, 1 - m.userData.phase)
      e = THREE.MathUtils.clamp(e, 0, 1)
      e = e * e * (3 - 2 * e)
      m.morphTargetInfluences[0] = Math.min(1, e * m.userData.bloomBias)
    }
    const k = THREE.MathUtils.smoothstep(bloom, 0.08, 0.5)
    petalMaterial.color.lerpColors(BUD_TINT, OPEN_TINT, k)
    stamenGroup.visible = bloom > 0.45
    const s = THREE.MathUtils.clamp((bloom - 0.45) / 0.55, 0, 1)
    stamenGroup.scale.setScalar(0.6 + s * s * (3 - 2 * s) * 0.4)
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
