import { createLily, makePetalTexture, LILY_DEFAULTS } from './lily.js'
import { createTulip, makeTulipTexture, TULIP_DEFAULTS } from './tulip.js'
import { createOrchid, makeOrchidTexture, ORCHID_DEFAULTS } from './orchid.js'

/*
 * Registro de tipos de flor. Cada tipo expone la MISMA interfaz para que el
 * ramo (bouquet.js) lo use sin saber el tipo:
 *   create({ petalMaterial, seed }) -> { group, meshes, setBloom(t), bloom }
 *   makeTexture(baseHex, throatHex?) -> THREE.CanvasTexture
 *   defaults: { color, throat?, presets[] }
 */
export const FLOWER_TYPES = {
  lirio: { name: 'Lirio', create: createLily, makeTexture: makePetalTexture, defaults: LILY_DEFAULTS },
  tulipan: { name: 'Tulipán', create: createTulip, makeTexture: makeTulipTexture, defaults: TULIP_DEFAULTS },
  orquidea: { name: 'Orquídea', create: createOrchid, makeTexture: makeOrchidTexture, defaults: ORCHID_DEFAULTS }
}

export const FLOWER_ORDER = ['lirio', 'tulipan', 'orquidea']
