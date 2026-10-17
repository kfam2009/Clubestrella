# Panel Club Estrella

Panel web de básquet con reloj, período, local y visita. El lector se instala en la **misma PC que OBS**. Consulta `127.0.0.1:4455` y envía únicamente los cuatro datos a Render por HTTPS. No requiere ZeroTier ni abrir puertos de la PC del cliente.

Incluye las correcciones de décimas (`05.4`) y de la confusión entre el `3` y el `1` en el marcador de visita, verificadas con capturas reales del tablero.

## Desplegar el panel en Render

1. Abrir [Crear Blueprint](https://dashboard.render.com/blueprint/new?repo=https://github.com/kfam2009/Clubestrella).
2. Seleccionar la cuenta/workspace correcto, conectar este repositorio y revisar el servicio `clubestrella-panel` antes de aplicar.
3. El archivo `render.yaml` configura un Web Service Node, plan gratuito, build `npm ci --ignore-scripts`, inicio `npm start` y salud `/healthz`.
4. Cuando el servicio esté activo, guardar su URL `https://....onrender.com`.
5. En **Environment** del servicio, copiar el valor privado de `INGEST_TOKEN` para configurar el lector. El Blueprint genera esa clave; no se guarda en este repositorio ni se muestra en el panel público.

Si se crea el Web Service manualmente en lugar de usar el Blueprint, configurar esos mismos comandos y una variable `INGEST_TOKEN` con una clave aleatoria de al menos 32 caracteres. El servidor se niega a iniciar sin clave.

La configuración debe tener **una sola instancia**: el último estado se mantiene en memoria. Después de un reinicio del servicio, vuelve a aparecer al reconectar el lector. No necesita base de datos. Consultar las condiciones actuales del [plan gratuito](https://render.com/docs/free) para uso durante una transmisión.

## Instalar en la PC del cliente

1. Descargar este repositorio como ZIP y extraerlo.
2. Instalar Python 3.10 o posterior desde [python.org](https://www.python.org/downloads/windows/) si todavía no está instalado. Activar **Add Python to PATH**.
3. En OBS, habilitar el servidor WebSocket en el puerto `4455`. La cámara del tablero debe estar activa y conservar el encuadre actual. La fuente usada por defecto se llama `Camara 2`.
4. En la carpeta `client`, ejecutar `INSTALAR.cmd`. Crea el entorno Python y solicita la URL de Render, `INGEST_TOKEN`, la clave de OBS si existe y el nombre exacto de la fuente.
5. Ejecutar `client/INICIAR.cmd`. Abre un monitor local en `http://127.0.0.1:8771/` y empieza a enviar lecturas a Render.
6. Mantener abierta la consola del lector durante el partido. Cerrar la consola detiene el lector. Si ya hay otro panel usando el puerto `8771`, detenerlo antes de iniciar este.

El monitor local muestra el tablero y la cámara del juego (`camara 01`) uno al lado del otro. Las imágenes del juego se renuevan aproximadamente una vez por segundo; es un monitor de capturas, no video fluido. Se consultan por separado y no demoran el lector del marcador. Ambas cámaras se ven en la PC del cliente; Render sigue recibiendo únicamente los datos.

Para cambiar la configuración, ejecutar `client/CONFIGURAR.ps1` con PowerShell o editar el archivo local `client/config.json`. Ese archivo contiene claves privadas: está excluido de Git y no debe compartirse. Los valores de ejemplo están en `client/config.example.json`.

## Abrir panel y salida

- Control: `https://TU-SERVICIO.onrender.com/index.html`
- Salida limpia 1920×1080: `https://TU-SERVICIO.onrender.com/graphics.html`
- Estado: `/api/state`
- Salud del servicio: `/healthz`

Cambiar nombres, logos y textos desde el panel. **Abrir salida limpia** conserva esos ajustes en el enlace. También se guardan en el navegador; las pestañas del mismo navegador se sincronizan. No son ajustes globales compartidos entre navegadores.

Las cifras se leen de capturas; no se extrapola un cronómetro. Si se pierde la lectura, el panel conserva el último dato, atenúa los campos atrasados y avisa **LECTURA EN PAUSA · ÚLTIMO DATO**. Al volver OBS o internet, el lector reintenta automáticamente y envía el estado más reciente.

## Alcance de la calibración

La lectura está calibrada para la fuente actual a 1920×1080. Si cambia el encuadre, zoom o posición del tablero, hay que ajustar `client/reader.py`. Admite `MM:SS` y el formato de tres dígitos `SS:T` del último minuto, mostrado como `SS.T`. Falta validar todos los dígitos y períodos durante un partido completo.

Las capturas de cámara y la clave de OBS permanecen en la PC del cliente. El servidor público recibe puntajes, reloj, período y datos de frescura, nunca video ni imágenes. OBS se consulta en modo de lectura: no se cambia la escena, las fuentes ni la emisión.

## Desarrollo y validación

Node 22 o posterior, sin dependencias de terceros:

```sh
npm ci --ignore-scripts
npm test
```

Para iniciar el servidor, definir `INGEST_TOKEN` en el entorno y ejecutar `npm start`. `PORT` es opcional fuera de Render y usa `10000` por defecto.

El lector requiere Pillow y NumPy, indicados en `client/requirements.txt`. Pruebas del código Python:

```sh
python -m unittest discover -s client -p "test_*.py"
```

Las pruebas con capturas originales se realizaron localmente; esas imágenes no se publican en el repositorio.
