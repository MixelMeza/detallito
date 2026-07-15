import * as THREE from 'three'
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js'
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js'
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js'
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js'

/*
 * Postprocesado: bloom suave para el brillo/glow.
 * En gama baja se omite y se renderiza directo.
 */
export function createPostFX(renderer, scene, camera, lowPerf) {
  if (lowPerf) {
    return {
      enabled: false,
      setBloom() {},
      resize() {},
      render() {
        renderer.render(scene, camera)
      }
    }
  }

  const composer = new EffectComposer(renderer)
  composer.setPixelRatio(renderer.getPixelRatio())
  composer.setSize(window.innerWidth, window.innerHeight)

  composer.addPass(new RenderPass(scene, camera))

  const bloom = new UnrealBloomPass(
    new THREE.Vector2(window.innerWidth, window.innerHeight),
    0.18, // strength (muy suave)
    0.5, // radius
    0.96 // threshold muy alto: solo los reflejos mas intensos brillan (sin halos)
  )
  composer.addPass(bloom)
  composer.addPass(new OutputPass())

  window.addEventListener('resize', () => {
    composer.setSize(window.innerWidth, window.innerHeight)
  })

  return {
    enabled: true,
    setBloom(strength) {
      bloom.strength = strength
    },
    resize() {
      composer.setSize(window.innerWidth, window.innerHeight)
    },
    render() {
      composer.render()
    }
  }
}
