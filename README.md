# 🌸 Lirios · Un regalo

Escena web **3D interactiva y realista** de lirios en un jarrón, hecha con **Three.js**.
Al abrir, los lirios brotan del jarrón; al tocarlos, se abren y se cierran con una
floración suave. Todo es personalizable: color de los lirios, forma/material/color del
jarrón y varios temas de ambiente. Funciona en móvil y se despliega en cualquier hosting.

## ✨ Características

- **Lirios 3D procedurales** con 6 tépalos, estambres y pistilo. La floración usa
  *morph targets* (cerrado ⇄ abierto) para una animación suave y realista.
- **Interacción táctil**: toca un lirio para abrirlo/cerrarlo; arrastra para girar la escena.
- **Animación de entrada** (los tallos crecen y las flores brotan escalonadamente).
- **Jarrón personalizable**: 3 formas (recto, ánfora, bulbo), 3 materiales
  (vidrio con refracción real, cerámica, metal) y color libre. Con agua interior.
- **5 temas** de ambiente (Estudio, Atardecer, Noche, Jardín, Ensueño) que cambian
  fondo, luz y brillo (*bloom*).
- **Optimizado para móvil**: ajusta calidad y desactiva postproceso en gama baja.

## 🚀 Uso

```bash
npm install
npm run dev        # servidor de desarrollo en http://localhost:8080  (host activado)
```

Vite mostrará una **URL de red** (p. ej. `http://192.168.x.x:8080`). Ábrela en el
teléfono que esté en la misma red Wi-Fi para probar el táctil.

## 📦 Compilar y desplegar

```bash
npm run build      # genera /dist con archivos estáticos
npm run preview    # sirve /dist en http://localhost:8080
```

La carpeta `dist/` es 100 % estática y autocontenida. Súbela a cualquier hosting:

- **Netlify / Vercel**: arrastra la carpeta `dist` o conecta el repo (build: `npm run build`, dir: `dist`).
- **GitHub Pages**: publica el contenido de `dist`. `vite.config.js` usa `base: './'`,
  así que funciona también en subrutas.
- **Cualquier servidor**: copia `dist/` a la raíz pública.

## 🛠️ Tecnologías

- [Three.js](https://threejs.org/) — render WebGL, materiales físicos, sombras.
- [GSAP](https://gsap.com/) — animaciones (entrada y floración).
- [Vite](https://vitejs.dev/) — bundler y servidor de desarrollo.

## 📁 Estructura

```
src/
  main.js              orquestacion + bucle de render
  core/scene.js        renderer, camara, luces, entorno
  core/postfx.js       bloom (postprocesado)
  flowers/lily.js      lirio procedural + morph de floracion
  flowers/vase.js      jarron (formas/materiales)
  flowers/bouquet.js   arreglo: tallos, hojas y flores
  interaction.js       tap para abrir/cerrar + intro
  themes.js            temas de fondo, luz y bloom
  ui.js                panel de personalizacion
  style.css            estilos del panel y layout
```
