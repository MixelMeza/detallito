# 🚀 Cómo compartirlo / publicarlo (gratis)

Al compilar, **todo queda dentro de un ÚNICO archivo**: `dist/index.html`
(no hay carpetas ni archivos sueltos). Para generarlo:

```bash
npm install      # solo la primera vez
npm run build    # crea dist/index.html con TODO dentro
```

---

## ⭐ Opción 1 — El archivo solo (SIN cuenta, SIN contraseña, la más fácil)

`dist/index.html` es la app completa (un solo archivo, ~640 KB, funciona sin internet).

- **Verlo en tu PC:** haz **doble clic** en `dist/index.html` → se abre en el navegador.
- **Enviárselo a alguien:** manda ese archivo por **WhatsApp / correo / Telegram**
  (como "documento"/archivo adjunto). Quien lo reciba lo abre y ya está — no necesita
  instalar nada.
- **En el teléfono:** al recibir el archivo, ábrelo con el navegador (Chrome/Safari).

> No requiere ninguna cuenta ni servidor. El archivo es tuyo para siempre.

---

## 🌐 Opción 2 — Si quieres un ENLACE (URL) para compartir

Para tener una dirección `https://...` sí hace falta un hosting. Los siguientes son
gratis (necesitan una cuenta gratuita, pero **no se paga nada**):

### GitHub Pages (recomendado si ya usas GitHub)
```bash
npm run build
npx gh-pages -d dist
```
Luego en tu repo: **Settings → Pages → rama `gh-pages`**. Queda en
`https://TU_USUARIO.github.io/NOMBRE_REPO/`.

### Netlify Drop (arrastrar y soltar)
1. `npm run build`
2. Entra en **https://app.netlify.com/drop** y **arrastra la carpeta `dist`**.
3. Te da una URL al instante. *(Para conservarla de forma permanente te pedirá crear
   una cuenta gratis; si no quieres cuenta, usa la Opción 1.)*

### Otras equivalentes gratis
**Vercel**, **Cloudflare Pages**, **Render (Static Site)** — todas sirven la carpeta
`dist` igual. Todas piden una cuenta gratuita.

---

## 📱 Notas

- Requiere un navegador con **WebGL** (todos los modernos: Chrome, Safari, Edge, Firefox).
- El botón 📷 guarda una **foto** de la escena con la dedicatoria, lista para redes.
- Si subes a un hosting, `vite.config.js` ya usa `base: './'`, así que funciona también
  en subrutas.
