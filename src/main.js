import * as THREE from 'three'
import { gsap } from 'gsap'
import './style.css'
import { createCore } from './core/scene.js'
import { createPostFX } from './core/postfx.js'
import { createVase } from './flowers/vase.js'
import { createBouquet } from './flowers/bouquet.js'
import { setupInteraction } from './interaction.js'
import { setupUI } from './ui.js'
import { THEMES } from './themes.js'

const canvas = document.getElementById('scene')
const core = createCore(canvas)
const { renderer, scene, camera, controls, lights, lowPerf } = core
const postfx = createPostFX(renderer, scene, camera, lowPerf)

// --- Contenido de la escena ---
const stage = new THREE.Group()
scene.add(stage)

const vase = createVase(scene)
stage.add(vase.group)

const bouquet = createBouquet(vase)
stage.add(bouquet.group)

// --- Particulas suaves flotando (ambiente "instagrameable") ---
function makeDotTexture() {
  const c = document.createElement('canvas')
  c.width = c.height = 64
  const ctx = c.getContext('2d')
  const g = ctx.createRadialGradient(32, 32, 0, 32, 32, 32)
  g.addColorStop(0, 'rgba(255,255,255,0.95)')
  g.addColorStop(0.35, 'rgba(255,232,244,0.55)')
  g.addColorStop(1, 'rgba(255,255,255,0)')
  ctx.fillStyle = g
  ctx.fillRect(0, 0, 64, 64)
  return new THREE.CanvasTexture(c)
}
const P_COUNT = lowPerf ? 22 : 52
const pPos = new Float32Array(P_COUNT * 3)
const pSpeed = new Float32Array(P_COUNT)
const pPhase = new Float32Array(P_COUNT)
for (let i = 0; i < P_COUNT; i++) {
  pPos[i * 3] = (Math.random() - 0.5) * 11
  pPos[i * 3 + 1] = Math.random() * 8
  pPos[i * 3 + 2] = (Math.random() - 0.5) * 6 - 1
  pSpeed[i] = 0.12 + Math.random() * 0.22
  pPhase[i] = Math.random() * Math.PI * 2
}
const pGeo = new THREE.BufferGeometry()
pGeo.setAttribute('position', new THREE.BufferAttribute(pPos, 3))
const particles = new THREE.Points(
  pGeo,
  new THREE.PointsMaterial({
    map: makeDotTexture(),
    size: 0.24,
    transparent: true,
    opacity: 0.5,
    depthWrite: false,
    sizeAttenuation: true
  })
)
scene.add(particles)

// --- Interaccion ---
const interaction = setupInteraction({ renderer, camera, bouquet, controls })

// --- Temas ---
let activeBloom = 0.4
function applyTheme(key) {
  const t = THEMES[key]
  if (!t) return
  scene.background = t.background()
  scene.fog = t.fog !== null ? new THREE.Fog(t.fog, 12, 26) : null
  lights.hemi.color.setHex(t.hemi.sky)
  lights.hemi.groundColor.setHex(t.hemi.ground)
  lights.hemi.intensity = t.hemi.intensity
  lights.key.color.setHex(t.key.color)
  lights.key.intensity = t.key.intensity
  lights.key.position.set(...t.key.pos)
  lights.rim.color.setHex(t.rim.color)
  lights.rim.intensity = t.rim.intensity
  lights.rim.position.set(...t.rim.pos)
  activeBloom = t.bloom
  postfx.setBloom(t.bloom)
}
applyTheme('estudio')

// --- API para el panel de UI ---
const app = {
  vase,
  bouquet,
  applyTheme,
  openAll() {
    bouquet.activeFlowers().forEach((f, i) => {
      if (f._bloomTween) f._bloomTween.kill()
      const proxy = { v: f.lily.bloom }
      f._bloomTween = gsap.to(proxy, {
        v: 1,
        duration: 2.2,
        delay: i * 0.07,
        ease: 'power2.out',
        onUpdate: () => f.lily.setBloom(proxy.v)
      })
    })
  },
  closeAll() {
    bouquet.activeFlowers().forEach((f, i) => {
      if (f._bloomTween) f._bloomTween.kill()
      const proxy = { v: f.lily.bloom }
      f._bloomTween = gsap.to(proxy, {
        v: 0.0,
        duration: 1.4,
        ease: 'power2.inOut',
        onUpdate: () => f.lily.setBloom(proxy.v)
      })
    })
  }
}
setupUI(app)

// --- Arranque automatico (sin boton, de frente) ---
const hint = document.getElementById('hint')
const loader = document.getElementById('app-loader')
let started = false

// --- Auto-ocultar controles (para capturas limpias); reaparecen al tocar ---
let uiTimer
function showUI() {
  document.body.classList.remove('ui-hidden')
  clearTimeout(uiTimer)
  uiTimer = setTimeout(() => document.body.classList.add('ui-hidden'), 3500)
}
;['pointerdown', 'pointermove', 'wheel', 'touchstart', 'keydown'].forEach((e) =>
  window.addEventListener(e, showUI, { passive: true })
)

function start() {
  if (started) return
  started = true
  document.body.classList.add('ready') // revela el boton de configuracion
  showUI() // arranca el temporizador de auto-ocultado
  if (loader) {
    loader.classList.add('hidden')
    setTimeout(() => loader.remove(), 800)
  }
  bouquet.playIntro(9) // las flores florecen en su sitio (no vienen de abajo)
  setTimeout(() => hint.classList.add('show'), 2400)
  setTimeout(() => hint.classList.remove('show'), 9000)
}
// arranca cuando la escena ya renderizo un par de cuadros
requestAnimationFrame(() => requestAnimationFrame(start))

// --- Guardar foto (para redes): escena + dedicatoria, descarga PNG ---
const photoBtn = document.getElementById('photo-btn')
if (photoBtn) {
  photoBtn.addEventListener('click', () => {
    photoBtn.classList.remove('flash')
    void photoBtn.offsetWidth
    photoBtn.classList.add('flash')

    postfx.render() // asegura el frame mas reciente en el buffer
    const gl = renderer.domElement
    const out = document.createElement('canvas')
    out.width = gl.width
    out.height = gl.height
    const ctx = out.getContext('2d')
    ctx.drawImage(gl, 0, 0)

    // dedicatoria incrustada (misma tipografia que en pantalla)
    const fs = Math.round(out.height * 0.06)
    ctx.textAlign = 'center'
    ctx.font = `italic ${fs}px "Snell Roundhand","Segoe Script","Brush Script MT",cursive`
    ctx.shadowColor = 'rgba(0,0,0,0.35)'
    ctx.shadowBlur = fs * 0.5
    ctx.fillStyle = 'rgba(255,255,255,0.96)'
    ctx.fillText('Para Fiorella', out.width / 2, out.height * 0.14)

    out.toBlob((blob) => {
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = 'para-fiorella.png'
      a.click()
      setTimeout(() => URL.revokeObjectURL(url), 2000)
    }, 'image/png')
  })
}

// --- Bucle de render ---
const clock = new THREE.Clock()
let elapsed = 0
const _sway = new THREE.Quaternion()
const _swayEuler = new THREE.Euler()
function animate() {
  requestAnimationFrame(animate)
  const dt = Math.min(clock.getDelta(), 0.05)
  elapsed += dt
  const t = elapsed

  // partículas: suben suave y se reciclan
  const pa = pGeo.attributes.position.array
  for (let i = 0; i < P_COUNT; i++) {
    pa[i * 3 + 1] += pSpeed[i] * dt
    pa[i * 3] += Math.sin(t * 0.5 + pPhase[i]) * 0.0015
    if (pa[i * 3 + 1] > 8.5) {
      pa[i * 3 + 1] = -0.5
      pa[i * 3] = (Math.random() - 0.5) * 11
    }
  }
  pGeo.attributes.position.needsUpdate = true

  // vaiven suave del ramo (brisa), aplicado sobre la orientacion base
  if (started) {
    bouquet.flowers.forEach((f, i) => {
      const g = f.lily.group
      const base = g.userData.baseQuat
      if (!base) return
      _sway.setFromEuler(
        _swayEuler.set(
          Math.cos(t * 0.55 + i * 1.3) * 0.02,
          0,
          Math.sin(t * 0.7 + i) * 0.028
        )
      )
      g.quaternion.copy(base).multiply(_sway)
    })
  }

  controls.update()
  postfx.render()
}
animate()

// exponer para depuracion
window.__regalo = app
window.__gsap = gsap
window.__view = { camera, controls, scene }
