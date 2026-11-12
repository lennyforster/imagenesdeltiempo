# Imágenes del tiempo (antes «Banco de ideas») — notas para Claude

- Vive en https://imagenesdeltiempo.app (repo `lennyforster/imagenesdeltiempo`, GitHub Pages con dominio propio; el DNS está en Hostinger). El repo viejo `lennyforster/banco-de-ideas` es solo una página que redirige acá pasando la sesión guardada en el #migrar=. Los datos siguen en los repos `banco-de-ideas-datos*`.

- Toda la app está en `index.html`.
- **Guía "Cómo se usa"** (botón en la fila del •••): cada vez que se agrega, cambia o se saca una feature, actualizar el array `AYUDA` en `index.html` en el mismo cambio. Lo pidió Lenny.
- Mantener el tono rioplatense y breve en los textos de la interfaz.
- **Cartel de novedades**: SIEMPRE, en cada cambio que se sube, sin excepción, sumar arriba del array `NOVEDADES` en `index.html` una entrada nueva con `n` = el anterior + 1. Nunca reusar ni editar una entrada ya subida: si no sube el `n`, el pop-up no vuelve a salir. Si el cambio solo lo ve Lenny (pruebas como «Versión texto»), la entrada lleva `mio:true` y el cartel le sale solo a él. Cada ítem lleva importancia: 1 = cambia cómo se usa la web, 2 = útil, 3 = detalle (sale al final en una línea, sin explicación). Usar criterio para no abrumar: casi todo lo cosmético es 3. Lo pidió Lenny: quiere ver el pop-up cada vez que cambiamos algo.
- **Cuentas** (cuenta.js, Supabase nzgljqcgygzjxpqmvrsh): se entra con usuario o mail + contraseña, sin confirmar mail (Supabase no manda mails a gente de afuera sin SMTP propio). Un usuario «x» se guarda como `x@imagenesdeltiempo.app`. Si alguien se olvida la contraseña, se cambia por SQL (`crypt(…, gen_salt('bf'))` en auth.users).
- **Dos tipos de plancha** (tabla `cuentas`, columna `modo`):
  - `github`: los usuarios de antes (Lenny y amigos). Repo `banco-de-ideas-datos-N` + token. No se migran.
  - `nube`: toda cuenta creada sin clave de GitHub. Ideas en la tabla `archivos` de Supabase (una fila por archivo, misma ruta que en GitHub: `ideas/x.json`; borrar = `borrado=true`). Imágenes en Cloudflare R2 (bucket `imagenes-del-tiempo`, cuenta Cloudflare «Rental» de Lenny) a través del Worker `imagenes-del-tiempo` (https://imagenes-del-tiempo.rental-bff.workers.dev, código en `worker-imagenes.js`; se publica con la API del panel). En los bloques la imagen queda como `r2:img/<id>.<ext>`.
  - En el navegador, `localStorage.plancha_modo = "nube"` marca el modo. El atajo del iPhone y los backups a Drive todavía solo andan con `github`.
- **Límites gratis**: Supabase 500 MB de base y 1 GB de archivos; R2 10 GB. Lenny pidió que le avisemos con tiempo si nos acercamos, porque no quiere pagar.
