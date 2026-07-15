import * as THREE from 'three'
import { gsap } from 'gsap'
import { createLily, makePetalTexture } from './lily.js'

/*
 * Arreglo floral.
 * - Se construyen MAX flores UNA sola vez, con posiciones FIJAS por indice
 *   (independientes de la cantidad visible). Cambiar la cantidad solo activa o
 *   retira flores de la cola, con animacion suave; las demas no se mueven.
 * - Cada flor tiene su propio material (para el tinte verde->color al abrir).
 */

const MAX = 12

// vertexColors: el tallo lleva un degradado verde->oscuro (se funde con el
// interior del jarron al entrar). color blanco para no teñir el vertex color.
const stemMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.65, vertexColors: true })
const leafMat = new THREE.MeshStandardMaterial({ color: 0x357a35, roughness: 0.6, side: THREE.DoubleSide })

function makeLeafGeometry() {
  const shape = new THREE.Shape()
  shape.moveTo(0, 0)
  shape.quadraticCurveTo(0.18, 0.5, 0, 1.1)
  shape.quadraticCurveTo(-0.18, 0.5, 0, 0)
  return new THREE.ShapeGeometry(shape, 8)
}
const leafGeo = makeLeafGeometry()

const GOLDEN = 2.399963
const rad = (d) => (d * Math.PI) / 180

export function createBouquet(vase) {
  const group = new THREE.Group()
  const flowers = []

  // El color vive en la textura (bordes blancos + centro rosa)
  let petalHex = '#f2a0c4'
  let throatHex = '#e6f0c2'
  let petalTexture = makePetalTexture(petalHex, throatHex)

  function makePetalMaterial() {
    return new THREE.MeshPhysicalMaterial({
      color: new THREE.Color('#ffffff'),
      map: petalTexture,
      roughness: 0.46,
      metalness: 0.0,
      side: THREE.DoubleSide,
      sheen: 0.7,
      sheenColor: new THREE.Color('#ffd9e6'),
      sheenRoughness: 0.55,
      // sin transmision: petalo opaco y mejor rendimiento en movil
      transmission: 0.0,
      ior: 1.35,
      envMapIntensity: 0.6
    })
  }
  const flowerMaterials = []

  const neckY = vase.height * 0.96

  function makeStem(head, az) {
    const H = vase.height
    const neckR = vase.neckRadius
    const hd = new THREE.Vector3(head.x, 0, head.z)
    const dirH = hd.clone().multiplyScalar(1 / (hd.length() || 1e-3))

    // Punto por el que el tallo cruza la boca (en la direccion de su flor).
    const mouth = new THREE.Vector3(dirH.x * neckR * 0.4, H * 0.96, dirH.z * neckR * 0.4)
    // El tallo BAJA hasta el FONDO del jarron (centro), curvandose suave hacia el
    // eje por dentro (donde no toca la pared y queda en penumbra). Arriba de la
    // boca es recto; abajo se hunde hasta el fondo, sea cual sea la forma.
    const bottom = new THREE.Vector3(0, H * 0.36, 0)
    const curve = new THREE.CatmullRomCurve3([bottom, mouth, head])
    const geo = new THREE.TubeGeometry(curve, 30, 0.03, 6, false)

    // Degradado verde -> oscuro: el tallo se ve verde por encima de la boca y se
    // va oscureciendo al bajar hasta fundirse con el fondo (llega hasta abajo).
    const posA = geo.attributes.position
    const colors = new Float32Array(posA.count * 3)
    const fadeTop = H * 0.96
    const fadeBot = H * 0.42
    const cGreen = new THREE.Color(0x3f7d3a)
    const cDark = new THREE.Color(0x1e1a17)
    const c = new THREE.Color()
    for (let i = 0; i < posA.count; i++) {
      let t = (posA.getY(i) - fadeBot) / (fadeTop - fadeBot)
      t = t < 0 ? 0 : t > 1 ? 1 : t
      c.copy(cDark).lerp(cGreen, t)
      colors[i * 3] = c.r
      colors[i * 3 + 1] = c.g
      colors[i * 3 + 2] = c.b
    }
    geo.setAttribute('color', new THREE.BufferAttribute(colors, 3))

    const stem = new THREE.Mesh(geo, stemMat)
    stem.castShadow = true
    // hojas bien por encima de la boca (brotan durante el crecimiento)
    const leaves = []
    for (let l = 0; l < 2; l++) {
      const t = 0.7 + l * 0.12
      const p = curve.getPoint(t)
      const leaf = new THREE.Mesh(leafGeo, leafMat)
      leaf.position.copy(p)
      leaf.scale.setScalar(0.001)
      leaf.rotation.y = az + l * 2.3
      leaf.rotation.z = 0.55
      leaf.rotation.x = -0.35
      stem.add(leaf)
      leaves.push({ mesh: leaf, param: t, baseScale: 0.6 + l * 0.14 })
    }
    // la flor mira a lo largo de la recta (parte visible)
    return { stem, curve, leaves, tip: head.clone(), dir: head.clone().sub(mouth).normalize() }
  }

  // Separa las cabezas para que no se toquen (una sola vez para las MAX)
  function relax(heads, radii) {
    const maxR = 1.95
    for (let iter = 0; iter < 90; iter++) {
      for (let a = 0; a < heads.length; a++) {
        for (let b = a + 1; b < heads.length; b++) {
          const pa = heads[a]
          const pb = heads[b]
          const d = pa.distanceTo(pb)
          const target = (radii[a] + radii[b]) * 0.82
          if (d < target && d > 1e-4) {
            const push = (target - d) * 0.5
            const dir = pa.clone().sub(pb)
            dir.y *= 0.35
            dir.normalize()
            pa.addScaledVector(dir, push)
            pb.addScaledVector(dir, -push)
          }
        }
      }
      for (const p of heads) {
        if (p.y < neckY + 0.6) p.y = neckY + 0.6
        const hr = Math.hypot(p.x, p.z)
        if (hr > maxR) {
          p.x *= maxR / hr
          p.z *= maxR / hr
        }
      }
    }
  }

  // ---- Construccion (una vez): MAX flores en posiciones fijas ----
  const up = new THREE.Vector3(0, 1, 0)
  const heads = []
  const radii = []
  const metas = []
  for (let i = 0; i < MAX; i++) {
    const isBud = i % 3 === 2 // ~1/3 capullos cerrados, distribuidos
    const t = i / (MAX - 1)
    const az = i * GOLDEN + 0.6
    const scale = isBud ? 0.55 : 0.6 + ((i * 29) % 10) / 10 * 0.14
    // espiral tipo filotaxis en cupula (bastante nivelada para no "caer")
    const rh = 0.58 * Math.sqrt(i) // radio horizontal
    const y = neckY + 1.7 - 0.075 * i
    const head = new THREE.Vector3(Math.cos(az) * rh, y, Math.sin(az) * rh)
    heads.push(head)
    radii.push(scale * 1.7)
    metas.push({ isBud, scale, az })
  }
  relax(heads, radii)

  for (let i = 0; i < MAX; i++) {
    const { isBud, scale, az } = metas[i]
    const stemObj = makeStem(heads[i], az)

    const mat = makePetalMaterial()
    flowerMaterials.push(mat)
    const lily = createLily({ petalMaterial: mat, seed: i + 1 })
    lily.group.position.copy(stemObj.tip)
    // todas miran a lo largo de su tallo, inclinadas hacia arriba (mas erguidas,
    // no caidas). Buds y flores igual -> coherente con el tallo recto.
    const dir = stemObj.dir.clone().lerp(up, 0.32).normalize()
    const quat = new THREE.Quaternion().setFromUnitVectors(up, dir)
    lily.group.quaternion.copy(quat)
    lily.group.userData.baseQuat = quat.clone()
    lily.group.userData.isBud = isBud

    const baseScaleVec = new THREE.Vector3(scale, scale, scale)
    lily.group.userData.baseScale = scale
    lily.group.userData.baseScaleVec = baseScaleVec

    // arranca inactiva y oculta
    lily.group.visible = false
    lily.group.scale.set(0.001, 0.001, 0.001)
    stemObj.stem.visible = false
    lily.setBloom(0)

    group.add(stemObj.stem)
    group.add(lily.group)
    flowers.push({ lily, stemObj, index: i, active: false, isBud })
  }

  // ---- Nacimiento: el tallo CRECE desde el jarron hacia arriba, la flor sube
  // con la punta (las hojas brotan al pasar) y al llegar arriba florece. ----
  const _p = new THREE.Vector3()
  function activate(f, delay = 0) {
    if (f.active) return
    f.active = true
    const g = f.lily.group
    const stem = f.stemObj.stem
    const curve = f.stemObj.curve
    const leaves = f.stemObj.leaves
    const idxCount = stem.geometry.index.count
    const base = g.userData.baseScale
    if (f._tween) f._tween.kill()
    if (f._bloomTween) f._bloomTween.kill()
    g.visible = true
    stem.visible = true
    f.lily.setBloom(0)

    // param 0.5 = boca; el tallo crece de la boca (0.5) hacia la flor (1)
    const apply = (gt) => {
      const fp = 0.5 + 0.5 * gt
      stem.geometry.setDrawRange(0, Math.max(6, Math.ceil(idxCount * fp)))
      curve.getPoint(fp, _p)
      g.position.copy(_p)
      g.scale.setScalar(Math.max(0.001, base * THREE.MathUtils.smoothstep(gt, 0.08, 0.85)))
      for (const lf of leaves) {
        const r = THREE.MathUtils.smoothstep(fp, lf.param - 0.05, lf.param + 0.03)
        lf.mesh.scale.setScalar(Math.max(0.001, lf.baseScale * r))
      }
    }
    apply(0)
    const grow = { t: 0 }
    f._tween = gsap.to(grow, {
      t: 1,
      duration: 2.2,
      delay,
      ease: 'power1.inOut',
      onUpdate: () => apply(grow.t)
    })
    if (!f.isBud) {
      const p = { v: 0 }
      f._bloomTween = gsap.to(p, {
        v: 1,
        duration: 2.2,
        delay: delay + 1.6, // florece al llegar arriba
        ease: 'power2.out',
        onUpdate: () => f.lily.setBloom(p.v)
      })
    }
  }

  function deactivate(f) {
    if (!f.active) return
    f.active = false
    const g = f.lily.group
    const stem = f.stemObj.stem
    if (f._tween) f._tween.kill()
    if (f._bloomTween) f._bloomTween.kill()
    const p = { v: f.lily.bloom }
    f._bloomTween = gsap.to(p, { v: 0, duration: 0.4, ease: 'power2.in', onUpdate: () => f.lily.setBloom(p.v) })
    f._tween = gsap.to(g.scale, {
      x: 0.001,
      y: 0.001,
      z: 0.001,
      duration: 0.5,
      ease: 'power2.in',
      onComplete: () => {
        g.visible = false
        stem.visible = false
      }
    })
  }

  let activeCount = 0

  function setCount(n) {
    n = THREE.MathUtils.clamp(n, 1, MAX)
    if (n > activeCount) {
      for (let i = activeCount; i < n; i++) activate(flowers[i], (i - activeCount) * 0.12)
    } else if (n < activeCount) {
      for (let i = n; i < activeCount; i++) deactivate(flowers[i])
    }
    activeCount = n
  }

  function playIntro(count = 7) {
    activeCount = 0
    for (let i = 0; i < count; i++) activate(flowers[i], 0.15 + i * 0.16)
    activeCount = count
  }

  function refreshTexture() {
    const tex = makePetalTexture(petalHex, throatHex)
    petalTexture.dispose()
    petalTexture = tex
    for (const m of flowerMaterials) {
      m.map = tex
      m.needsUpdate = true
    }
  }

  return {
    group,
    flowers,
    get count() {
      return activeCount
    },
    activeFlowers() {
      return flowers.filter((f) => f.active)
    },
    setCount,
    playIntro,
    setPetalColor(hex) {
      petalHex = hex
      refreshTexture()
    },
    setThroatColor(hex) {
      throatHex = hex
      refreshTexture()
    },
    getPickables() {
      const arr = []
      for (const f of flowers) {
        if (!f.active) continue
        for (const m of f.lily.tepalMeshes) {
          m.userData.flowerRef = f
          arr.push(m)
        }
      }
      return arr
    }
  }
}
