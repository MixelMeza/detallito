import * as THREE from 'three'

/*
 * Jarron generado por revolucion (LatheGeometry) a partir de un perfil 2D.
 * Formas y materiales cuidados; color personalizable.
 */

const HEIGHT = 3.2
const RADIAL = 0.98 // escala del radio del perfil (unidades de mundo)

// Perfiles (x = radio 0..1, y = altura 0..1). Siluetas elegantes con la BOCA
// ancha (como un jarron real): los tallos salen del borde y caen a los lados.
const PROFILES = {
  bulbo: [
    [0.0, 0.0], [0.34, 0.0], [0.4, 0.015], [0.4, 0.05],
    [0.32, 0.09], [0.52, 0.2], [0.8, 0.34], [0.92, 0.5],
    [0.86, 0.64], [0.68, 0.78], [0.6, 0.87], [0.66, 0.96], [0.72, 1.0]
  ],
  anfora: [
    [0.0, 0.0], [0.26, 0.0], [0.32, 0.02], [0.3, 0.06],
    [0.22, 0.12], [0.44, 0.3], [0.72, 0.5], [0.82, 0.62],
    [0.7, 0.76], [0.56, 0.86], [0.5, 0.92], [0.62, 0.98], [0.68, 1.0]
  ],
  columna: [
    [0.0, 0.0], [0.52, 0.0], [0.58, 0.02], [0.58, 0.06],
    [0.52, 0.1], [0.54, 0.45], [0.56, 0.78], [0.58, 0.9],
    [0.68, 0.97], [0.7, 1.0]
  ]
}

function profilePoints(shape) {
  const pts = PROFILES[shape] || PROFILES.bulbo
  return pts.map(([x, y]) => new THREE.Vector2(x * RADIAL, y * HEIGHT))
}

function makeVaseMaterial(kind, color) {
  const col = new THREE.Color(color)
  if (kind === 'vidrio') {
    return new THREE.MeshPhysicalMaterial({
      color: col,
      metalness: 0,
      roughness: 0.05,
      transmission: 1.0,
      thickness: 0.7,
      ior: 1.5,
      transparent: true,
      opacity: 1,
      side: THREE.DoubleSide,
      clearcoat: 0.5,
      clearcoatRoughness: 0.12,
      envMapIntensity: 1.1,
      attenuationColor: col,
      attenuationDistance: 1.5,
      specularIntensity: 1.0
    })
  }
  if (kind === 'metal') {
    return new THREE.MeshPhysicalMaterial({
      color: col,
      metalness: 1.0,
      roughness: 0.16,
      clearcoat: 0.6,
      clearcoatRoughness: 0.1,
      envMapIntensity: 1.6,
      side: THREE.DoubleSide
    })
  }
  // ceramica esmaltada: mate con barniz suave (clearcoat) y ligero sheen
  return new THREE.MeshPhysicalMaterial({
    color: col,
    metalness: 0.0,
    roughness: 0.5,
    clearcoat: 0.6,
    clearcoatRoughness: 0.32,
    sheen: 0.35,
    sheenColor: new THREE.Color('#ffffff'),
    sheenRoughness: 0.6,
    envMapIntensity: 0.7,
    side: THREE.DoubleSide
  })
}

export function createVase() {
  const group = new THREE.Group()

  let shape = 'bulbo'
  let kind = 'ceramica'
  let color = '#e9e2d6'

  let mesh = null
  let water = null
  let interior = null

  // Hueco interior OSCURO y PROFUNDO: al mirar dentro se ve oscuridad con
  // profundidad (no el vacio claro ni una tapa gris plana). Material SIN
  // iluminacion (MeshBasicMaterial) para que se mantenga oscuro siempre.
  function buildInterior() {
    if (interior) {
      group.remove(interior)
      interior.traverse((o) => {
        if (o.geometry) o.geometry.dispose()
        if (o.material) o.material.dispose()
      })
      interior = null
    }
    if (kind === 'vidrio') return // el agua ya da profundidad

    interior = new THREE.Group()
    // Molde interior con la FORMA REAL del jarron (perfil algo mas estrecho),
    // oscuro y SIN luz (MeshBasic) -> desde arriba se ve el interior oscuro con
    // fondo plano, como un jarron real; se adapta solo a cada forma.
    const darkMat = new THREE.MeshBasicMaterial({ color: 0x342f28, side: THREE.DoubleSide })
    // fondo SOLIDO y elevado (no llega al suelo) -> tapa lo de abajo y evita el
    // z-fighting con la sombra del suelo (eso era "lo raro" del centro).
    const yMin = 0.32
    const pts = [new THREE.Vector2(0, yMin * HEIGHT)]
    for (const [x, y] of PROFILES[shape] || PROFILES.bulbo) {
      if (y <= yMin) continue
      const f = 0.84 + 0.12 * Math.pow(y, 6) // mas estrecho que la pared
      pts.push(new THREE.Vector2(x * RADIAL * f, y * HEIGHT))
    }
    const geo = new THREE.LatheGeometry(pts, 64)
    const inner = new THREE.Mesh(geo, darkMat)
    interior.add(inner)
    interior.renderOrder = -1
    group.add(interior)
  }

  function buildWater() {
    if (water) {
      group.remove(water)
      water.geometry.dispose()
      water.material.dispose()
    }
    const waterGeo = new THREE.CylinderGeometry(0.72, 0.55, HEIGHT * 0.58, 40, 1)
    const waterMat = new THREE.MeshPhysicalMaterial({
      color: new THREE.Color('#cfeaf2'),
      roughness: 0.02,
      transmission: 0.92,
      thickness: 1.2,
      ior: 1.33,
      transparent: true,
      opacity: 0.85,
      envMapIntensity: 1.0
    })
    water = new THREE.Mesh(waterGeo, waterMat)
    water.position.y = HEIGHT * 0.3
    water.renderOrder = -1
    group.add(water)
  }

  function build() {
    if (mesh) {
      group.remove(mesh)
      mesh.geometry.dispose()
      mesh.material.dispose()
    }
    const geo = new THREE.LatheGeometry(profilePoints(shape), 80)
    geo.computeVertexNormals()
    const mat = makeVaseMaterial(kind, color)
    mesh = new THREE.Mesh(geo, mat)
    mesh.castShadow = true
    mesh.receiveShadow = true
    group.add(mesh)

    buildInterior() // hueco oscuro y profundo (excepto en vidrio)

    // agua solo visible en vidrio
    if (kind === 'vidrio') buildWater()
    else if (water) {
      group.remove(water)
      water.geometry.dispose()
      water.material.dispose()
      water = null
    }
  }

  build()

  return {
    group,
    get height() {
      return HEIGHT
    },
    get topRadius() {
      return 0.5 * RADIAL
    },
    // radio de la boca del jarron (para que los tallos salgan de su borde)
    get neckRadius() {
      const pts = PROFILES[shape] || PROFILES.bulbo
      return pts[pts.length - 1][0] * RADIAL
    },
    setShape(s) {
      shape = s
      build()
    },
    setMaterial(k) {
      kind = k
      build()
    },
    setColor(c) {
      color = c
      if (mesh) mesh.material.color.set(c)
      if (mesh && mesh.material.attenuationColor) mesh.material.attenuationColor.set(c)
    }
  }
}
