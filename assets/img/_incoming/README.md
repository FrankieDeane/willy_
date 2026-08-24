# Bandeja de entrada de las fotos

Las **31 carpetas ya están creadas**, una por serie, con el nombre exacto que
tiene cada una en Google Drive. No hace falta crear ninguna: entrá a la que
corresponda y soltá las fotos adentro.

Cada carpeta tiene su propio README con el enlace directo a la carpeta de
Drive, cuántas fotos había ahí, y con qué nombre van a quedar.

## Cómo subirlas desde el navegador, sin instalar nada

1. Abrí la carpeta de la serie, por ejemplo `In Tuscany/`.
2. **Add file ▸ Upload files** y arrastrá las fotos de esa serie desde Drive.
3. Commit, en **cualquier rama que no sea la principal**.

El workflow `photos.yml` se dispara solo y hace todo lo demás: renombra a
`<slug>-gbq-<n>.jpg`, descarta los duplicados del export (`_rw_1200` y
`_rw_1920` de la misma foto), borra los metadatos, genera las tres medidas web,
regenera las páginas y borra los originales. En la pestaña **Actions** queda un
resumen de qué serie procesó y cuántas fotos salieron.

Se puede subir de a una serie por vez. Las carpetas quedan en su lugar después
de cada tanda, listas para la siguiente.

## Por qué importa el nombre de la carpeta

Es la clave que vincula lo que subís con la serie correcta: se cruza contra el
campo `drive` de `tools/albums.json`. Si una carpeta no coincide con ninguna,
el proceso la deja intacta y te avisa cuál fue, en vez de adivinar. Por eso
están pre-creadas — así ese error no puede ocurrir.

## Qué pasa con los originales

Se borran del árbol apenas se procesan, así que nunca quedan publicados. Pero
siguen existiendo en el historial de git de esa rama hasta que el Pull Request
se cierre con **Squash and merge**. El squash deja un solo commit con el
resultado final, sin los originales.

Desde la computadora ni siquiera llegan a git: `.gitignore` los excluye y
`node tools/prepare-photos.mjs --consume` los borra al terminar.
