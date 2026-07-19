import * as THREE from 'three'

/*
 * Tulipan (Tulipa) procedural.
 * - 6 tepalos anchos y OBOVADOS (punta redondeada), fuertemente ACUCHARADOS,
 *   en 2 verticilos de 3.
 * - Cerrado = copa/huevo; abierto = cuenco/estrella (NO recurva como el lirio).
 * - Centro: 6 estambres cortos con anteras OSCURAS (casi negras) + estigma
 *   trilobulado palido. Mancha basal oscura en la textura.
 */

const U = 24
const V = 16
const LENGTH = 1.9
const BASE_RADIUS = 0.04
// media anchura ANGULAR del tepalo (rad): 6 tepalos * 2*ALPHA ~ 360 -> envuelven
// la flor formando una superficie continua (copa/huevo) que se abraza
const ALPHA_MAX = 0.62
const rad = (d) => (d * Math.PI) / 180

function tepalAngle(u, open) {
  // el perfil (radio vs altura) define la forma; los tepalos lo envuelven
  if (open) return rad(10 + 50 * Math.pow(u, 1.1)) // CUENCO/bol abierto
  // cerrado: HUEVO -> panza y cierra en la punta
  return rad(40 * Math.cos(Math.PI * Math.min(u * 0.93, 1)))
}

function smooth01(x) {
  x = Math.max(0, Math.min(1, x))
  return x * x * (3 - 2 * x)
}

// perfil obovado 0..1 (garra en la base, ancho en la panza, punta roma)
function shapeWidth(u) {
  const rise = smooth01(u / 0.16)
  const roundTip = 1 - 0.5 * smooth01((u - 0.82) / 0.18)
  return rise * roundTip
}

function buildPositions(open) {
  const positions = []
  const uvs = []
  const cy = [0]
  const cz = [BASE_RADIUS]
  const ds = LENGTH / U
  for (let i = 1; i <= U; i++) {
    const uMid = (i - 0.5) / U
    const th = tepalAngle(uMid, open)
    cy.push(cy[i - 1] + Math.cos(th) * ds)
    cz.push(cz[i - 1] + Math.sin(th) * ds)
  }
  // cada punto se ENVUELVE en un arco de radio cz alrededor del eje -> el tepalo
  // es un trozo de la superficie de la flor (copa/huevo), no una lamina plana
  for (let i = 0; i <= U; i++) {
    const u = i / U
    const alpha = ALPHA_MAX * shapeWidth(u)
    const r = cz[i]
    for (let j = 0; j <= V; j++) {
      const v = (j / V) * 2 - 1
      const th = v * alpha
      positions.push(r * Math.sin(th), cy[i], r * Math.cos(th))
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

  // ANILLO AMARILLO alrededor de la mancha (rasgo del tulipan) en la base
  const cx = c.width / 2
  const cH = c.height
  const ring = ctx.createRadialGradient(cx, cH, cH * 0.04, cx, cH, cH * 0.3)
  ring.addColorStop(0, 'rgba(255,214,64,0.95)')
  ring.addColorStop(0.62, 'rgba(255,204,48,0.85)')
  ring.addColorStop(1, 'rgba(255,204,48,0)')
  ctx.fillStyle = ring
  ctx.fillRect(0, cH * 0.62, c.width, cH * 0.38)
  // MANCHA BASAL oscura central encima (casi negra/purpura), mas contenida
  const blotch = ctx.createRadialGradient(cx, cH * 0.97, 4, cx, cH * 0.97, cH * 0.15)
  blotch.addColorStop(0, 'rgba(16,6,20,0.98)')
  blotch.addColorStop(0.7, 'rgba(26,8,26,0.85)')
  blotch.addColorStop(1, 'rgba(26,8,26,0)')
  ctx.fillStyle = blotch
  ctx.fillRect(0, cH * 0.78, c.width, cH * 0.22)
  // BASE VERDE en el borde inferior (donde el tepalo nace del tallo)
  const greenBase = ctx.createLinearGradient(0, cH, 0, cH * 0.9)
  greenBase.addColorStop(0, 'rgba(110,165,74,0.95)')
  greenBase.addColorStop(1, 'rgba(110,165,74,0)')
  ctx.fillStyle = greenBase
  ctx.fillRect(0, cH * 0.9, c.width, cH * 0.1)

  const tex = new THREE.CanvasTexture(c)
  tex.colorSpace = THREE.SRGBColorSpace
  tex.anisotropy = 4
  return tex
}

const BUD_TINT = new THREE.Color('#c3d29a')
const OPEN_TINT = new THREE.Color('#ffffff')

export const TULIP_DEFAULTS = {
  color: '#d42a2a',
  presets: ['#d42a2a', '#f0a500', '#ffd23f', '#ff7ab0', '#ffffff', '#8e3bd6']
}

export function createTulip({ petalMaterial, seed = 0 }) {
  const group = new THREE.Group()
  const meshes = []
  const geo = getGeometry()

  for (let i = 0; i < 6; i++) {
    const mesh = new THREE.Mesh(geo, petalMaterial)
    mesh.castShadow = true
    const inner = i % 2 === 0
    mesh.rotation.y = (i / 6) * Math.PI * 2 + (hash(seed * 6 + i) - 0.5) * 0.1
    mesh.rotation.x = (inner ? -0.02 : 0.03) + (hash(seed * 13 + i) - 0.5) * 0.06
    mesh.position.y = inner ? 0.02 : 0
    mesh.scale.y = 0.97 + hash(seed * 23 + i) * 0.08
    mesh.updateMorphTargets()
    mesh.userData.bloomBias = 0.92 + hash(seed * 31 + i) * 0.12
    mesh.userData.phase = (inner ? 0.16 : 0.0) + hash(seed * 41 + i) * 0.08
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
