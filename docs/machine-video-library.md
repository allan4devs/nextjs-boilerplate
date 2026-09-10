# Videos de las fichas

El selector enumera los videos de `public` y sus subcarpetas. Para los archivos
MOV/M4V de celular, usa una copia H.264/AAC con el sufijo `.browser.mp4` cuando
existe. El nombre visible sigue siendo el del original; al guardar se asocia la
ruta MP4 reproducible. Las copias no aparecen como entradas duplicadas.

Después de agregar o renombrar originales, prepará las copias:

```powershell
python -m pip install imageio-ffmpeg
python scripts/prepare-browser-videos.py
```

También se puede indicar un ejecutable existente mediante `FFMPEG_BINARY`.
El proceso conserva los originales, omite copias vigentes y publica cada copia
solo cuando termina su conversión. Recargá el selector después del proceso.
`npm run build` regenera el catálogo de producción; no convierte archivos.

Los videos de `public/videos` están ignorados por Git en este proyecto. Tanto
los originales como las copias deben estar presentes en el entorno que arma y
publica los archivos estáticos; un push del código por sí solo no los sube.
