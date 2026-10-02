# Desarrollo y consumo de memoria

`npm run dev` usa Webpack. Reiniciá cualquier servidor anterior con Ctrl+C antes
de volver a ejecutar el comando: el proceso viejo sigue usando Turbopack.

El lanzador `scripts/next-memory.mjs` fija `--max-old-space-size=4096` también en
`NODE_OPTIONS`, para que el servidor hijo de Next herede el límite. Es un límite
de 4 GiB del heap de JavaScript **por proceso**, no de toda la RAM del sistema.
Se conservan los demás flags de Node. Next, sin este valor en el entorno, puede
darle al servidor de desarrollo la mitad de la RAM total del equipo.

`npm run build` también usa Webpack. La configuración habilita
`webpackMemoryOptimizations` y limita los trabajadores del build a dos. Se
conserva el alias del paquete Human a su implementación de navegador para evitar
que Webpack intente compilar el backend nativo de TensorFlow.

`npm run dev:turbo` conserva una alternativa explícita para investigar Turbopack.
Su objetivo de memoria es de 2 GiB; este objetivo no limita el RSS total del
proceso ni la suma de los trabajadores. No usarlo como garantía contra un bloqueo.

En la revisión del 2 de octubre de 2026, el log de desarrollo mostraba unos
47 segundos compilando `/entrenador` y 94 segundos escribiendo la caché de
Turbopack. Un build vigilado con Turbopack superó 6.5 GB de RAM y se detuvo
antes de consumir la memoria disponible. Esto muestra presión del compilador;
no demuestra por sí solo la causa exacta del bloqueo de Windows.

Para revisar las correcciones sin abrir servidores:

```powershell
node scripts/check-memory-lifecycle.mjs
node scripts/check-trainer-health.mjs
npx tsc --noEmit
npm run build
```

La primera prueba simula una petición de eventos que no termina y permisos de
cámara que responden después de salir o cambiar de captura. Comprueba el límite
de 60 eventos, el timeout de entrega, la liberación de los tracks y la herencia
del límite de heap. La segunda verifica la ficha Trainer, incluidos permisos y
conflictos entre actualizaciones. Son pruebas aisladas; no sustituyen una
medición del navegador real durante una sesión de uso.
