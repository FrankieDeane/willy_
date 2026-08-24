# Soltá acá las carpetas de Drive

Esta carpeta es la bandeja de entrada de las fotos. Está vacía a propósito.

## Qué va acá

Una carpeta por serie, **con el nombre exacto que tiene en Google Drive**
(La Vicuña 🦙 Agency ▸ Clientes logrados ▸ Willy ▸ Porfolio):

```
_incoming/In Tuscany/xxxxxxxx_rw_1920.jpg
_incoming/In Tuscany/yyyyyyyy_rw_1920.jpg
_incoming/Edinburgh/zzzzzzzz_rw_1920.jpg
...
```

Los nombres de archivo no importan — el que sale del export de Drive está bien.
Lo que importa es **el nombre de la carpeta**, porque es lo que se cruza contra
el campo `drive` de `tools/albums.json` para saber a qué serie pertenece cada
foto. Si una carpeta no coincide con ninguna, el proceso la deja intacta y te
avisa cuál fue, en vez de adivinar.

## Cómo subirlas desde el navegador, sin instalar nada

1. En GitHub, parado en **cualquier rama que no sea la principal**, entrá a
   esta carpeta y usá **Add file ▸ Upload files**.
2. Arrastrá las carpetas de series. Hacé commit.
3. El workflow `photos.yml` se dispara solo: renombra a `<slug>-gbq-<n>.jpg`,
   descarta los duplicados del export, borra los metadatos, genera las tres
   medidas web, regenera las páginas y **borra los originales**. En la pestaña
   Actions queda un resumen de qué procesó.

Se puede subir de a tandas. No hace falta mandar las 31 series juntas.

## Qué pasa con los originales

Se borran del árbol apenas se procesan, así que nunca quedan publicados. Pero
siguen existiendo en el historial de git de esta rama hasta que el Pull Request
se cierre con **Squash and merge** — por eso el README principal insiste con
eso. El squash deja un solo commit con el resultado final, sin los originales.

Desde la computadora, en cambio, ni siquiera llegan a git: `.gitignore` los
excluye y `prepare-photos.mjs --consume` los borra al terminar. Es el camino
recomendado si tenés Node instalado.
