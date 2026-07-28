# ASIGNA — Modelo de Asignación y Método Húngaro

Aplicación web (HTML + CSS + JavaScript puro, sin frameworks ni instalación)
para el curso de Investigación de Operaciones. Permite resolver el
**problema de asignación** aplicando el **método húngaro**, mostrando
animada cada una de sus etapas: reducción de filas, reducción de columnas,
cobertura mínima de ceros y ajuste de la matriz, hasta llegar a la
asignación óptima.

## 📁 Estructura del proyecto

```
hytora-asignacion/
├── index.html          → Dashboard / página de inicio
├── teoria.html          → Teoría del método + demo animada automática
├── resolver.html        → Resolver (matriz interactiva editable)
├── css/
│   └── style.css        → Todo el sistema visual (paleta, tipografía, animaciones)
└── js/
    ├── hungarian.js      → Motor del algoritmo (método húngaro / Kuhn-Munkres)
    ├── stepplayer.js     → Renderiza y anima los pasos (matriz, líneas, grafo)
    ├── resolver.js        → Lógica de la página "Resolver" (inputs, ejemplos)
    └── app.js            → Utilidades compartidas (contadores, toasts)
```

## ▶️ Cómo ejecutarlo en Visual Studio Code

1. Descomprime el archivo `.zip` y abre la carpeta `hytora-asignacion` en VS Code
   (`Archivo → Abrir carpeta…`).
2. Instala la extensión **Live Server** (de Ritwick Dey) desde el panel de
   extensiones, si no la tienes.
3. Haz clic derecho sobre `index.html` → **"Open with Live Server"**
   (o el botón "Go Live" en la barra inferior).
4. Se abrirá automáticamente en `http://127.0.0.1:5500/index.html`.

> No necesitas backend, base de datos ni `npm install`: todo corre en el
> navegador. También puedes abrir `index.html` directamente con doble clic,
> aunque Live Server recarga los cambios automáticamente, lo cual es más
> cómodo mientras editas.

## 🧮 ¿Cómo funciona el algoritmo? (`js/hungarian.js`)

`Hungarian.solve(matriz, modo)` implementa el método húngaro clásico:

1. **Cuadrar la matriz** — si hay distinto número de orígenes y destinos, se
   rellena con ceros (fila/columna ficticia).
2. **Minimizar vs. maximizar** — si `modo === 'max'`, se transforma la matriz
   restando cada valor del mayor costo (`M − cᵢⱼ`) para convertirlo en un
   problema de minimización equivalente.
3. **Reducción de filas y columnas** — se resta el mínimo de cada fila y
   luego de cada columna.
4. **Cobertura mínima de ceros** — se calcula un **emparejamiento máximo**
   sobre el grafo bipartito de ceros (algoritmo de Kuhn / caminos
   aumentantes) y, a partir de él, la **cobertura mínima de líneas** usando
   el **Teorema de König**.
5. **Ajuste** — si el número de líneas es menor que `n`, se busca el menor
   valor no cubierto, se resta de las celdas no cubiertas y se suma en las
   intersecciones; se repite el paso 4.
6. **Asignación óptima** — cuando el número de líneas iguala a `n`, el
   emparejamiento encontrado **es** la asignación óptima.

La función devuelve `{ steps, assignment, totalCost, mode }`, donde `steps`
es la lista de snapshots (uno por etapa) que usa `StepPlayer` para animar
la interfaz.

## 🎬 Animación (`js/stepplayer.js`)

La clase `StepPlayer` es reutilizable: recibe el resultado de
`Hungarian.solve()` y se encarga de pintar el stepper superior, la matriz
animada (con líneas de cobertura dibujadas dinámicamente y celdas que
laten al cambiar de valor), el grafo bipartito SVG y el panel de
resultados. Se usa tanto en `resolver.html` (modo interactivo) como en
`teoria.html` (demo de reproducción automática).

## ✏️ Personalizar

- **Colores y tipografía:** variables CSS al inicio de `css/style.css`
  (`--blue-600`, `--amber-500`, `--emerald-500`, fuentes `Space Grotesk` /
  `Inter` / `JetBrains Mono`).
- **Ejemplos precargados:** objeto `EXAMPLES` en `js/resolver.js`.
- **Tamaño máximo de matriz:** opciones del `<select>` `rows-input` /
  `cols-input` en `resolver.html` (por defecto hasta 6×6).

---
Proyecto académico — Investigación de Operaciones · Modelo de Asignación y Método Húngaro.
