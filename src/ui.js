import { THEMES, THEME_ORDER } from './themes.js'

/*
 * Panel de personalizacion. Cablea los controles del DOM con la app 3D.
 */

const LILY_PRESETS = [
  '#f2a0c4', '#f7c8dc', '#e56b9a', '#c85a86',
  '#ffffff', '#ffd27a', '#ff9d5c', '#ff6f6f',
  '#c86bff', '#8fb3ff', '#b6f5c2', '#ffe08a'
]

export function setupUI(app) {
  const panel = document.getElementById('panel')
  const toggle = document.getElementById('panel-toggle')
  const closeBtn = document.getElementById('panel-close')

  function openPanel() {
    panel.classList.add('open')
    panel.setAttribute('aria-hidden', 'false')
    toggle.style.opacity = '0'
  }
  function closePanel() {
    panel.classList.remove('open')
    panel.setAttribute('aria-hidden', 'true')
    toggle.style.opacity = '1'
  }
  toggle.addEventListener('click', openPanel)
  closeBtn.addEventListener('click', closePanel)

  // --- Tabs ---
  const tabs = panel.querySelectorAll('.tab')
  const tabPanels = panel.querySelectorAll('.tab-panel')
  tabs.forEach((tab) => {
    tab.addEventListener('click', () => {
      tabs.forEach((t) => t.classList.remove('active'))
      tabPanels.forEach((p) => p.classList.remove('active'))
      tab.classList.add('active')
      panel.querySelector(`[data-panel="${tab.dataset.tab}"]`).classList.add('active')
    })
  })

  // --- Swatches de color de lirio ---
  const swatchWrap = document.getElementById('lily-swatches')
  const colorInput = document.getElementById('lily-color')
  LILY_PRESETS.forEach((hex, i) => {
    const b = document.createElement('button')
    b.className = 'swatch' + (i === 0 ? ' active' : '')
    b.style.background = hex
    b.addEventListener('click', () => {
      swatchWrap.querySelectorAll('.swatch').forEach((s) => s.classList.remove('active'))
      b.classList.add('active')
      app.bouquet.setPetalColor(hex)
      colorInput.value = hex
    })
    swatchWrap.appendChild(b)
  })
  colorInput.addEventListener('input', (e) => {
    app.bouquet.setPetalColor(e.target.value)
    swatchWrap.querySelectorAll('.swatch').forEach((s) => s.classList.remove('active'))
  })

  // --- Color de garganta ---
  const throat = document.getElementById('lily-throat')
  throat.addEventListener('change', (e) => app.bouquet.setThroatColor(e.target.value))

  // --- Cantidad ---
  const count = document.getElementById('lily-count')
  const countVal = document.getElementById('count-val')
  count.addEventListener('input', (e) => {
    countVal.textContent = e.target.value
  })
  count.addEventListener('change', (e) => {
    app.bouquet.setCount(parseInt(e.target.value, 10))
  })

  // --- Abrir/cerrar todas ---
  document.getElementById('open-all').addEventListener('click', () => app.openAll())
  document.getElementById('close-all').addEventListener('click', () => app.closeAll())

  // --- Jarron: forma / material / color ---
  function wireSegment(id, cb) {
    const seg = document.getElementById(id)
    seg.querySelectorAll('button').forEach((btn) => {
      btn.addEventListener('click', () => {
        seg.querySelectorAll('button').forEach((b) => b.classList.remove('active'))
        btn.classList.add('active')
        cb(btn.dataset.val)
      })
    })
  }
  wireSegment('vase-shape', (v) => app.vase.setShape(v))
  wireSegment('vase-material', (v) => app.vase.setMaterial(v))
  document.getElementById('vase-color').addEventListener('input', (e) => app.vase.setColor(e.target.value))

  // --- Temas ---
  const grid = document.getElementById('theme-grid')
  THEME_ORDER.forEach((key, i) => {
    const t = THEMES[key]
    const card = document.createElement('button')
    card.className = 'theme-card' + (i === 0 ? ' active' : '')
    card.style.background = t.thumb
    const label = document.createElement('span')
    label.textContent = t.name
    card.appendChild(label)
    card.addEventListener('click', () => {
      grid.querySelectorAll('.theme-card').forEach((c) => c.classList.remove('active'))
      card.classList.add('active')
      app.applyTheme(key)
    })
    grid.appendChild(card)
  })
}
