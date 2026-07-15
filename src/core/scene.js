import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js'

// Detecta gama baja para ajustar calidad
export function detectLowPerf() {
  const mem = navigator.deviceMemory || 4
  const cores = navigator.hardwareConcurrency || 4
  const coarse = matchMedia('(pointer: coarse)').matches
  return (mem <= 3 || cores <= 4) && coarse
}

export function createCore(canvas) {
  const lowPerf = detectLowPerf()

  const renderer = new THREE.WebGLRenderer({
    canvas,
    antialias: !lowPerf,
    alpha: false,
    powerPreference: 'high-performance',
    preserveDrawingBuffer: true // permite guardar la escena como foto (PNG)
  })
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, lowPerf ? 1.5 : 2))
  renderer.setSize(window.innerWidth, window.innerHeight)
  renderer.shadowMap.enabled = true
  renderer.shadowMap.type = THREE.PCFSoftShadowMap
  renderer.toneMapping = THREE.ACESFilmicToneMapping
  renderer.toneMappingExposure = 0.92
  renderer.outputColorSpace = THREE.SRGBColorSpace

  const scene = new THREE.Scene()

  const camera = new THREE.PerspectiveCamera(42, window.innerWidth / window.innerHeight, 0.1, 100)
  // de frente y ligeramente elevada; la distancia se calcula segun la pantalla
  camera.position.set(0, 3.5, 12.5)

  // Encuadre responsivo: en vertical (telefono) se aleja para que todo entre
  const FRAME_CENTER = new THREE.Vector3(0, 3.15, 0)
  const FRAME_HALF_W = 3.1
  const FRAME_HALF_H = 4.0
  function fitDistance() {
    const aspect = window.innerWidth / window.innerHeight
    const tanV = Math.tan((camera.fov * Math.PI) / 180 / 2)
    const dV = FRAME_HALF_H / tanV
    const dH = FRAME_HALF_W / (tanV * aspect)
    return Math.max(dV, dH) * 1.16
  }

  // Entorno para reflejos realistas (vidrio/metal) sin descargar HDRI
  const pmrem = new THREE.PMREMGenerator(renderer)
  const envRT = pmrem.fromScene(new RoomEnvironment(), 0.04)
  scene.environment = envRT.texture

  // Luces (se reconfiguran por tema)
  const hemi = new THREE.HemisphereLight(0xffffff, 0x444466, 1.1)
  scene.add(hemi)

  const key = new THREE.DirectionalLight(0xffffff, 2.4)
  key.position.set(4, 8, 5)
  key.castShadow = true
  key.shadow.mapSize.set(lowPerf ? 1024 : 2048, lowPerf ? 1024 : 2048)
  key.shadow.camera.near = 1
  key.shadow.camera.far = 30
  key.shadow.camera.left = -8
  key.shadow.camera.right = 8
  key.shadow.camera.top = 8
  key.shadow.camera.bottom = -8
  key.shadow.bias = -0.0004
  key.shadow.normalBias = 0.02
  scene.add(key)

  const rim = new THREE.DirectionalLight(0xdfe8ff, 1.0)
  rim.position.set(-5, 4, -4)
  scene.add(rim)

  // Suelo receptor de sombras
  const floorMat = new THREE.ShadowMaterial({ opacity: 0.28 })
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(50, 50), floorMat)
  floor.rotation.x = -Math.PI / 2
  floor.position.y = 0
  floor.receiveShadow = true
  scene.add(floor)

  const controls = new OrbitControls(camera, renderer.domElement)
  controls.enableDamping = true
  controls.dampingFactor = 0.06
  controls.target.copy(FRAME_CENTER)
  controls.minPolarAngle = 0.18 // permite mirar casi desde arriba
  controls.maxPolarAngle = Math.PI / 1.95
  controls.enablePan = false
  controls.autoRotate = false
  controls.autoRotateSpeed = 0.4

  function applyFraming(initial) {
    const dist = fitDistance()
    controls.minDistance = dist * 0.55
    controls.maxDistance = dist * 1.9
    if (initial) {
      // vista frontal con una ligera inclinacion hacia abajo (no exagerada)
      const dir = new THREE.Vector3(0, 0.22, 1).normalize()
      camera.position.copy(FRAME_CENTER).addScaledVector(dir, dist)
    } else {
      // conserva la direccion; solo aleja si algo quedaria fuera de cuadro
      const offset = camera.position.clone().sub(controls.target)
      if (offset.length() < dist) {
        offset.setLength(dist)
        camera.position.copy(controls.target).add(offset)
      }
    }
    camera.updateProjectionMatrix()
    controls.update()
  }
  applyFraming(true)

  function onResize() {
    camera.aspect = window.innerWidth / window.innerHeight
    camera.updateProjectionMatrix()
    renderer.setSize(window.innerWidth, window.innerHeight)
    applyFraming(false)
  }
  window.addEventListener('resize', onResize)

  return { renderer, scene, camera, controls, lights: { hemi, key, rim }, floor, lowPerf }
}
