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
const LENGTH = 1.85 // alto de la flor. Con MAXR 0.6 -> diametro ~1.2 => ratio ~1.6:1
const BASE_RADIUS = 0.05
const MAXR = 0.6 // radio maximo de la flor -> mas RECHONCHA (como el morado real)
// exponentes del huevo: base estrecha (A) y hombros llenos + cima ROMA (B bajo)
const EGG_A = 0.7
const EGG_B = 0.45
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
const ALPHA_CLOSED = 0.72
const ALPHA_OPEN = 0.6
function tepalWidth(u, open) {
  const rise = smooth01(u / 0.12) // nace estrecho del receptaculo
  const tipTaper = open ? 0.35 : 0.1
  return rise * (1 - tipTaper * smooth01((u - 0.62) / 0.38))
}

// Meridiano (radio, altura) del tepalo. CLAVE del arreglo: la CIMA es
// REDONDEADA (perfil tipo raiz cuadrada -> domo, como el top de un circulo),
// NUNCA una punta afilada. Antes se integraba un angulo que formaba un cono.
const CLOSED_NORM = (() => {
  let m = 1e-6
  for (let i = 0; i <= 200; i++) {
    const u = i / 200
    const r = Math.pow(u, EGG_A) * Math.pow(1 - u, EGG_B)
    if (r > m) m = r
  }
  return m
})()
function meridian(u, open) {
  const y = LENGTH * u
  // HUEVO rechoncho: base estrecha, hombros LLENOS en el tercio superior, y CIMA
  // ROMA/redondeada. (1-u)^0.45 dobla el perfil en domo arriba (nunca punta).
  const egg = (MAXR * Math.pow(u, EGG_A) * Math.pow(1 - u, EGG_B)) / CLOSED_NORM
  if (!open) return { r: Math.max(BASE_RADIUS, egg), y }
  // ABIERTO: copa. La mitad superior se EVIERTE hacia afuera (las puntas se
  // abren y separan un poco -> se ve el centro), pero el cuerpo sigue solapado.
  const mouth = MAXR * 0.44 * smooth01((u - 0.42) / 0.58) // boca se abre
  const tipOut = MAXR * 0.12 * smooth01((u - 0.75) / 0.25) // puntas apenas evertidas
  const drop = 0.16 * smooth01((u - 0.45) / 0.55) // se acorta al abrir
  return { r: Math.max(BASE_RADIUS, Math.max(egg, mouth) + tipOut), y: y - drop }
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

// Textura: tepalo de color pleno + MANCHA BASAL oscura (rasgo del tulipan)
export function makeTulipTexture(baseHex = '#d42a2a') {
  const c = document.createElement('canvas')
  c.width = 256
  c.height = 512
  const ctx = c.getContext('2d')
  ctx.fillStyle = baseHex
  ctx.fillRect(0, 0, c.width, c.height)

  // ligero brillo (centro un poco mas claro a lo largo)
  const sheen = ctx.createLinearGradient(0, 0, c.width, 0)
  sheen.addColorStop(0, 'rgba(0,0,0,0.12)')
  sheen.addColorStop(0.5, 'rgba(255,255,255,0.14)')
  sheen.addColorStop(1, 'rgba(0,0,0,0.12)')
  ctx.fillStyle = sheen
  ctx.fillRect(0, 0, c.width, c.height)

  // DEGRADADO vertical SUTIL: color SATURADO casi entero (como el morado/rojo
  // real); solo el tercio inferior se aclara un POCO (no a blanco). Antes se iba
  // a blanco puro y quedaba lavado -> ese era parte del problema.
  const vgrad = ctx.createLinearGradient(0, 0, 0, c.height)
  vgrad.addColorStop(0, 'rgba(255,255,255,0)') // puntas: color pleno
  vgrad.addColorStop(0.62, 'rgba(255,255,255,0)') // sigue pleno
  vgrad.addColorStop(0.85, 'rgba(255,250,245,0.2)') // apenas se aclara
  vgrad.addColorStop(1, 'rgba(255,248,240,0.4)') // base algo mas clara, NO blanca
  ctx.fillStyle = vgrad
  ctx.fillRect(0, 0, c.width, c.height)

  // ANILLO AMARILLO + MANCHA basal: rasgos del INTERIOR. Muy CONTENIDOS y BAJOS
  // (bottom ~10%) para que queden ocultos por el receptaculo y NO asomen fuera.
  const cx = c.width / 2
  const cH = c.height
  const ring = ctx.createRadialGradient(cx, cH, cH * 0.02, cx, cH, cH * 0.14)
  ring.addColorStop(0, 'rgba(255,214,64,0.9)')
  ring.addColorStop(0.7, 'rgba(255,204,48,0.6)')
  ring.addColorStop(1, 'rgba(255,204,48,0)')
  ctx.fillStyle = ring
  ctx.fillRect(0, cH * 0.8, c.width, cH * 0.2)
  const blotch = ctx.createRadialGradient(cx, cH * 0.99, 3, cx, cH * 0.99, cH * 0.09)
  blotch.addColorStop(0, 'rgba(16,6,20,0.95)')
  blotch.addColorStop(0.7, 'rgba(26,8,26,0.7)')
  blotch.addColorStop(1, 'rgba(26,8,26,0)')
  ctx.fillStyle = blotch
  ctx.fillRect(0, cH * 0.9, c.width, cH * 0.1)
  // BASE VERDE en el borde inferior (donde el tepalo nace del tallo)
  const greenBase = ctx.createLinearGradient(0, cH, 0, cH * 0.92)
  greenBase.addColorStop(0, 'rgba(110,165,74,0.9)')
  greenBase.addColorStop(1, 'rgba(110,165,74,0)')
  ctx.fillStyle = greenBase
  ctx.fillRect(0, cH * 0.92, c.width, cH * 0.08)

  // ENRIQUECER el color (multiply): la luz/reflejo lavaban el rojo a coral.
  // Multiply con el propio color profundiza la saturacion; en los claros (base
  // palida/blanca) casi no hace nada -> funciona para cualquier color.
  ctx.globalCompositeOperation = 'multiply'
  ctx.globalAlpha = 0.3
  ctx.fillStyle = baseHex
  ctx.fillRect(0, 0, c.width, cH * 0.72) // solo el cuerpo de color, no la base clara
  ctx.globalAlpha = 1
  ctx.globalCompositeOperation = 'source-over'

  const tex = new THREE.CanvasTexture(c)
  tex.colorSpace = THREE.SRGBColorSpace
  tex.anisotropy = 4
  return tex
}

const BUD_TINT = new THREE.Color('#c3d29a')
const OPEN_TINT = new THREE.Color('#ffffff')

export const TULIP_DEFAULTS = {
  color: '#d42a2a',
  presets: ['#d42a2a', '#f0a500', '#ffd23f', '#ff7ab0', '#ffffff', '#8e3bd6'],
  sizeScale: 1.25, // un poco mas grandes que lirio/orquidea
  spread: 0.62 // mas JUNTOS (son estrechos) -> ramo denso, no disperso
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
