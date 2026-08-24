# Guillermo Bernaldo de Quirós — sitio de fotografía

Sitio estático de 31 series fotográficas, en inglés y español, con venta de
copias de edición limitada.

- **74 páginas HTML reales** (una por sección y por serie, en cada idioma).
  No es una single-page app: Google y un visitante sin JavaScript ven lo mismo.
- **Cero dependencias en el sitio publicado.** Ni scripts de terceros, ni
  fuentes externas, ni analíticas, ni cookies, ni tokens. Ver `SECURITY.md`.
- Todo se genera desde tres archivos de datos. **Nunca edites el HTML a mano:**
  se regenera y perdés el cambio.

---

## Cargar las fotos

Los archivos quedan con el nombre que pediste: `<serie>-gbq-<n>.jpg`.
Por ejemplo `tuscany-gbq-1.jpg`, `edinburgh-gbq-14.jpg`.
El `<serie>` sale del campo `slug` de `tools/albums.json`, así que el nombre
es una decisión escrita en un archivo, no algo que el script adivine.

Hay dos caminos. **El primero es el recomendado**, porque los originales nunca
entran al repositorio ni a su historial.

### Camino A — desde tu computadora (recomendado)

Necesitás [Node.js](https://nodejs.org) 20 o superior instalado (una vez).

1. En Drive, entrá a **La Vicuña 🦙 Agency ▸ Clientes logrados ▸ Willy ▸
   Porfolio**, seleccioná las 31 carpetas, botón derecho ▸ **Descargar**.
   Drive te manda un `.zip`.
2. Descomprimilo dentro del repo en `assets/img/_incoming/`, de modo que quede
   una carpeta por serie, **con el nombre exacto que tiene en Drive**:

   ```
   assets/img/_incoming/In Tuscany/xxxx_rw_1920.jpg
   assets/img/_incoming/Edinburgh/yyyy_rw_1920.jpg
   ...
   ```
3. Corré:

   ```bash
   npm --prefix tools ci          # solo la primera vez
   node tools/prepare-photos.mjs --consume
   node tools/build.mjs
   ```
4. Commiteá y pusheá. Listo.

`prepare-photos.mjs` hace todo esto de una:

- renombra a `<slug>-gbq-<n>.jpg`;
- **descarta los duplicados** del export de Drive — la misma foto viene como
  `…_rw_1200.jpg` y `…_rw_1920.jpg`, y a veces una tercera vez como `… (1).jpg`;
  se queda con la versión más grande de cada grupo;
- **borra todos los metadatos** (EXIF, IPTC, XMP, ICC). Esto importa de verdad:
  los exports de cámara suelen llevar coordenadas GPS, y el rastro GPS de un
  fotógrafo de paisaje es un mapa de dónde vive y dónde trabaja;
- genera las tres medidas web: 1600 / 960 / 480 px de lado largo;
- escribe `assets/img/dimensions.json`, que es lo que permite a las páginas
  reservar el espacio exacto de cada foto y no saltar mientras cargan;
- con `--consume`, borra los originales al terminar.

### Camino B — solo desde el navegador, sin instalar nada

1. En GitHub, creá una rama llamada exactamente **`photos`**.
2. Con esa rama seleccionada: **Add file ▸ Upload files**, y arrastrá las
   carpetas de series dentro de `assets/img/_incoming/`.
3. Al hacer commit, el workflow `photos.yml` se dispara solo: procesa, renombra,
   limpia metadatos, regenera el sitio y borra los originales.
4. Abrí un Pull Request de `photos` a la rama principal y mergealo con
   **Squash and merge**. Después **borrá la rama `photos`**.

> El *squash* y el borrado de la rama no son opcionales: son lo que evita que
> los originales en tamaño completo queden para siempre en el historial de git,
> desde donde cualquiera podría recuperarlos.

---

## Editar el contenido

Tres archivos, y de ahí sale todo:

| Archivo | Qué controla |
|---|---|
| `tools/albums.json` | Las 31 series: título EN/ES, slug, lugar, tema, texto de cada una, foto de portada |
| `tools/i18n.json` | Absolutamente todo el texto del sitio, en los dos idiomas |
| `tools/site.json` | Dominio, ruta base, **email de contacto**, tamaños, papeles, imagen de compartir |

Después de tocar cualquiera de ellos:

```bash
node tools/build.mjs
```

### Pendiente antes de publicar

`tools/site.json` tiene `"email": ""`. Mientras esté vacío, los formularios solo
ofrecen **«copiar como texto»**: no arman un `mailto:` porque no hay a dónde
mandarlo. Poné ahí la dirección a la que querés que lleguen las consultas y
volvé a correr `node tools/build.mjs`.

---

## Estructura

```
index.html  work.html  prints.html  selection.html  about.html  contact.html
albums/<slug>.html          31 series, en inglés
es/…                        el sitio completo en español
assets/css  assets/js  assets/fonts  assets/img
sitemap.xml  robots.txt  _headers  vercel.json
tools/                      generadores y datos (no se publica)
```

Las páginas en español viven un nivel más abajo, así que sus rutas a `assets/`
llevan un `../` más. Lo resuelve `assetPrefix()` en `tools/build.mjs`, y
`tools/check-links.mjs` lo verifica en cada push — fue exactamente el bug que
dejó a todo el español sin CSS la primera vez.

---

## Armá tu selección

Es la parte comercial nueva. Un visitante recorre el portfolio, toca el **✛**
sobre las fotos que le gustan, y en `selection.html` elige tamaño, papel y
enmarcado y manda **el conjunto entero como una sola consulta**.

La página además le sugiere cómo colgarlo según cuántas eligió — una sola,
díptico, tríptico, o serie de cinco o más —, que es la forma natural de que una
consulta de una foto se convierta en una de tres.

No hay carrito, ni cuenta, ni pago, ni base de datos. La selección vive en el
`localStorage` del visitante y no sale nunca de su navegador; la consulta se
arma localmente y se entrega a su propio cliente de correo. Por eso no hay
ningún token que robar: no existe.

---

## SEO

Pensado para Estados Unidos y Europa:

- **URLs separadas por idioma** con `hreflang` en las dos direcciones y
  `x-default` al inglés. Es lo que permite que Google sirva el inglés en EE.UU.,
  Canadá y el Reino Unido y el español en España y Latinoamérica, en vez de
  elegir uno e indexar la mitad del sitio.
- **Una URL indexable por serie.** Con rutas por hash (`#/album/…`) las 31
  series eran una sola página para un buscador.
- **Un `ImageObject` por fotografía** en el JSON-LD, con autor, aviso de
  copyright, crédito y página de licencia. Para quien vende copias, esto es lo
  más valioso del marcado: es lo que mete cada foto en Google Images con su
  autoría atada.
- `BreadcrumbList`, `ImageGallery`, `Person`, `Service` y `CollectionPage`.
- `max-image-preview:large` — la mayor parte del tráfico va a llegar por
  búsqueda de imágenes.
- `sitemap.xml` generado con las 74 URLs y sus alternativas de idioma.
- Títulos y descripciones distintos por página, escritos, no derivados.

---

## Hosting

`cleanUrls` está **apagado** a propósito en `vercel.json`: las páginas se
enlazan entre sí por su nombre `.html` real, así el mismo build funciona igual
en GitHub Pages, Vercel, Netlify y hasta abriendo el archivo local. Con
`cleanUrls` activado, cada enlace interno sería un redirect 308 que se aleja de
su propia URL canónica.

La política de seguridad vive en tres lugares porque cada host la aplica
distinto — `vercel.json`, `_headers` y la etiqueta `<meta>` de cada página, que
es lo único que puede hacer GitHub Pages. `tools/check-config.mjs` verifica que
las tres digan exactamente lo mismo, y que `vercel.json` no tenga ninguna clave
que Vercel vaya a rechazar (JSON no admite comentarios: una nota `"//"` al lado
de una opción tira abajo el deploy entero).

---

## Comandos

```bash
node tools/build.mjs                       # regenerar el sitio
node tools/prepare-photos.mjs [--consume]  # procesar assets/img/_incoming/
node tools/check-links.mjs                 # verificar cada enlace interno
node tools/check-config.mjs                # verificar que la CSP sea idéntica en los 3 hosts
node tools/scan-secrets.mjs                # buscar credenciales filtradas
```

Los tres últimos corren solos en CI. `checks.yml` además falla si el HTML
commiteado no coincide con lo que generan los datos, así que no puede quedar
desincronizado sin que alguien se entere.
