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

1. En GitHub, parado en **cualquier rama que no sea la principal** (la del Pull
   Request abierto sirve), entrá a `assets/img/_incoming/`.
2. **Add file ▸ Upload files** y arrastrá las carpetas de series. Commit.
3. El workflow `photos.yml` se dispara solo: procesa, renombra, limpia
   metadatos, regenera el sitio y borra los originales. En la pestaña Actions
   te deja un resumen con qué serie procesó y cuántas fotos.
4. Se puede repetir de a tandas. Cuando estén todas, mergeá con
   **Squash and merge** y borrá la rama.

> El *squash* y el borrado de la rama no son opcionales: son lo que evita que
> los originales en tamaño completo queden para siempre en el historial de git,
> desde donde cualquiera podría recuperarlos. Por el camino A ni siquiera
> llegan a git.

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

---

## Que el formulario funcione

Hay tres formas de que una consulta llegue, y el sitio las prueba **en este
orden**. La primera que funcione, gana; el visitante nunca se queda con un
formulario que no hizo nada, y nunca pierde lo que escribió.

### 1. Envío real (recomendado) — `api/enquiry.js` en Vercel

Es la única que manda el mail de verdad sin que el visitante salga de la
página. La clave que envía el mail vive en una variable de entorno del
servidor: **nunca llega al navegador**, así que no hay nada que robar del lado
del cliente.

En Vercel: **Project ▸ Settings ▸ Environment Variables**.

| Variable | Para qué |
|---|---|
| `ENQUIRY_TO` | `gbernaldodequiros@yahoo.com`. **Obligatoria.** |
| `RESEND_API_KEY` | Una API key de [resend.com](https://resend.com) (plan gratis: 3.000 mails/mes) |
| `ENQUIRY_FROM` | Remitente verificado. Si no la ponés, usa el de prueba de Resend. |

O, en vez de Resend:

| Variable | Para qué |
|---|---|
| `ENQUIRY_WEBHOOK` | Cualquier URL que acepte un POST con JSON |

Esa segunda opción sirve para mandar las consultas a **la planilla de Google
que ya tenés** mediante un Apps Script, o a Zapier, o a lo que sea. No implica
crear cuenta en ningún lado: la URL es toda la configuración.

Después de cargar las variables, redesplegá una vez para que la función las lea.

### 2. `mailto:` — si no hay backend pero sí hay dirección

Ya está configurado: `tools/site.json` tiene `gbernaldodequiros@yahoo.com`. Al
enviar se abre el cliente de correo del visitante con todo cargado. Es lo que
corre hoy, y lo que va a correr siempre en GitHub Pages, que no puede ejecutar
funciones.

La dirección no viaja como una sola cadena: se parte en usuario y dominio y se
vuelve a unir en el navegador, así un scraper que busca `@` en los archivos
estáticos no encuentra nada. Es un badén contra los recolectores más perezosos,
**no** una protección — cualquier cosa que ejecute JavaScript la rearma igual
de fácil que la página. La solución de fondo es el camino 1: con `ENQUIRY_TO`
en el servidor, se puede dejar `"email": ""` y la dirección deja de salir del
servidor por completo.

### 3. Portapapeles — si no hay ninguna de las dos

Copia la consulta ya armada y le dice al visitante que la pegue en un mail.

> **Estado actual:** funciona el camino 2. Para pasar al 1, cargá `ENQUIRY_TO` y
> `RESEND_API_KEY` en Vercel y redesplegá — no hay nada que cambiar en el código.

### Anti-spam

Sin CAPTCHA — sería un script de terceros en un sitio cuya postura entera es
que no carga nada de ningún lado. En su lugar: campo trampa invisible, piso de
tiempo de envío, límites duros en cada campo, límite de frecuencia por IP, y
**la selección se vuelve a validar contra el catálogo en el servidor**, así el
cuerpo del mail no se puede usar para colar texto arbitrario.

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
### El sitio no se indexa hasta que haya fotos

`tools/site.json` tiene `"indexable": "auto"`. Mientras no haya **ninguna**
fotografía real en `assets/img/`, cada página se genera con
`noindex, nofollow`, `robots.txt` queda cerrado y no se publica `sitemap.xml`.

No es prudencia excesiva: un portfolio de fotografía indexado **sin una sola
foto** es peor que no estar. Google ve páginas vacías y 250 URLs de imagen que
dan 404, y esa primera impresión tarda semanas en revertirse.

Se destraba **solo** en cuanto se sube la primera foto y se regenera el sitio.
No hay que acordarse de nada el día del lanzamiento. Para forzarlo en un
sentido u otro, `"indexable": true` o `false`.


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
