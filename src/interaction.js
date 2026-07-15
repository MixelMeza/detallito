import * as THREE from 'three'
import { gsap } from 'gsap'

/*
 * Interaccion tactil/raton:
 * - distingue "tap" de "arrastre" (no abre flores al girar la escena)
 * - al tocar una flor alterna su floracion con un tween suave
 * - animacion de entrada (los lirios brotan del jarron)
 */
export function setupInteraction({ renderer, camera, bouquet, controls }) {
  const raycaster = new THREE.Raycaster()
  const pointer = new THREE.Vector2()
  const dom = renderer.domElement

  let downX = 0
  let downY = 0
  let downT = 0
  let moved = false

  function onDown(e) {
    const t = e.touches ? e.touches[0] : e
    downX = t.clientX
    downY = t.clientY
    downT = performance.now()
    moved = false
  }

  function onMove(e) {
    const t = e.touches ? e.touches[0] : e
    if (Math.hypot(t.clientX - downX, t.clientY - downY) > 10) moved = true
  }

  function onUp(e) {
    const dt = performance.now() - downT
    if (moved || dt > 500) return // fue un arrastre/gesto, no un tap
    const t = e.changedTouches ? e.changedTouches[0] : e
    pointer.x = (t.clientX / window.innerWidth) * 2 - 1
    pointer.y = -(t.clientY / window.innerHeight) * 2 + 1
    raycaster.setFromCamera(pointer, camera)

    const pickables = bouquet.getPickables()
    const hits = raycaster.intersectObjects(pickables, false)
    if (hits.length) {
      const flower = hits[0].object.userData.flowerRef
      toggleFlower(flower)
    }
  }

  function toggleFlower(flower) {
    if (!flower) return
    const lily = flower.lily
    const target = lily.bloom > 0.5 ? 0.0 : 1.0
    if (flower._bloomTween) flower._bloomTween.kill()
    const proxy = { v: lily.bloom }
    flower._bloomTween = gsap.to(proxy, {
      v: target,
      duration: target > 0.5 ? 2.6 : 2.0, // apertura lenta y suave
      ease: target > 0.5 ? 'power2.out' : 'power2.inOut',
      onUpdate: () => lily.setBloom(proxy.v)
    })
  }

  dom.addEventListener('pointerdown', onDown)
  dom.addEventListener('pointermove', onMove)
  dom.addEventListener('pointerup', onUp)

  return { toggleFlower }
}
