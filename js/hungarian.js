/* ============================================================
   HÚNGARO.JS — Motor del Método Húngaro (Algoritmo de Kuhn-Munkres)
   ------------------------------------------------------------
   Resuelve el Problema de Asignación clásico de Investigación de
   Operaciones y devuelve, además de la solución óptima, la lista
   completa de "pasos" (snapshots) que la interfaz usa para animar
   cada etapa del método: reducción de filas, reducción de columnas,
   cobertura mínima de ceros (Teorema de König) y ajuste de la matriz.
   ============================================================ */

const Hungarian = (() => {

  /** Clona una matriz numérica */
  function cloneMatrix(m) {
    return m.map(row => row.slice());
  }

  /** Construye una matriz cuadrada n x n rellenando con ceros (ficticios) */
  function squareify(matrix) {
    const rows = matrix.length;
    const cols = matrix[0].length;
    const n = Math.max(rows, cols);
    const sq = [];
    for (let i = 0; i < n; i++) {
      const row = [];
      for (let j = 0; j < n; j++) {
        row.push(i < rows && j < cols ? matrix[i][j] : 0);
      }
      sq.push(row);
    }
    return { matrix: sq, n, rows, cols };
  }

  /** Kuhn: empareja al máximo las filas/columnas usando solo celdas con valor 0 */
  function maxMatching(zeroMask, n) {
    const matchCol = new Array(n).fill(-1); // matchCol[c] = fila asignada
    const matchRow = new Array(n).fill(-1); // matchRow[r] = columna asignada

    function augment(r, visited) {
      for (let c = 0; c < n; c++) {
        if (zeroMask[r][c] && !visited[c]) {
          visited[c] = true;
          if (matchCol[c] === -1 || augment(matchCol[c], visited)) {
            matchCol[c] = r;
            matchRow[r] = c;
            return true;
          }
        }
      }
      return false;
    }

    let size = 0;
    for (let r = 0; r < n; r++) {
      const visited = new Array(n).fill(false);
      if (augment(r, visited)) size++;
    }
    return { matchRow, matchCol, size };
  }

  /** Teorema de König: a partir del emparejamiento máximo obtiene la
   *  cobertura mínima de líneas (filas y columnas) sobre los ceros. */
  function minLineCover(zeroMask, n, matchRow, matchCol) {
    const rowMarked = new Array(n).fill(false);
    const colMarked = new Array(n).fill(false);
    const queue = [];

    for (let r = 0; r < n; r++) {
      if (matchRow[r] === -1) {
        rowMarked[r] = true;
        queue.push(r);
      }
    }

    while (queue.length) {
      const r = queue.shift();
      for (let c = 0; c < n; c++) {
        if (zeroMask[r][c] && !colMarked[c]) {
          colMarked[c] = true;
          const r2 = matchCol[c];
          if (r2 !== -1 && !rowMarked[r2]) {
            rowMarked[r2] = true;
            queue.push(r2);
          }
        }
      }
    }

    // Cobertura mínima = filas NO marcadas + columnas marcadas
    const coveredRows = [];
    const coveredCols = [];
    for (let r = 0; r < n; r++) if (!rowMarked[r]) coveredRows.push(r);
    for (let c = 0; c < n; c++) if (colMarked[c]) coveredCols.push(c);
    return { coveredRows, coveredCols };
  }

  function buildZeroMask(matrix, n) {
    const mask = [];
    for (let i = 0; i < n; i++) {
      mask.push(matrix[i].map(v => Math.abs(v) < 1e-9));
    }
    return mask;
  }

  /**
   * Resuelve el problema de asignación.
   * @param {number[][]} inputMatrix matriz de costos (no necesariamente cuadrada)
   * @param {'min'|'max'} mode tipo de optimización
   * @returns {object} { steps, assignment, totalCost, n, originalRows, originalCols }
   */
  function solve(inputMatrix, mode = 'min') {
    const steps = [];
    const { matrix: squared, n, rows: originalRows, cols: originalCols } = squareify(inputMatrix);

    // Si es maximización, transformamos a un problema de minimización equivalente
    let working = cloneMatrix(squared);
    let maxVal = 0;
    if (mode === 'max') {
      maxVal = Math.max(...working.flat());
      working = working.map(row => row.map(v => maxVal - v));
    }

    const original = cloneMatrix(working); // copia "costo" ya transformada, usada como referencia

    steps.push({
      type: 'original',
      title: 'Matriz de costos',
      description: mode === 'max'
        ? 'Partimos de la matriz original. Como el objetivo es MAXIMIZAR, se transformó restando cada valor del mayor costo de la matriz (M − cᵢⱼ) para poder aplicar el método húngaro, que minimiza por naturaleza.'
        : 'Esta es la matriz de costos del problema de asignación. El método húngaro la transformará paso a paso hasta encontrar ceros suficientes para asignar de forma óptima.',
      matrix: cloneMatrix(working)
    });

    // ---------- Paso 1: reducción por filas ----------
    const rowMins = [];
    for (let i = 0; i < n; i++) {
      const min = Math.min(...working[i]);
      rowMins.push(min);
      if (min !== 0) working[i] = working[i].map(v => v - min);
    }
    steps.push({
      type: 'row-reduction',
      title: 'Reducción de filas',
      description: 'Se localiza el menor valor de cada fila y se resta a todos los elementos de esa fila. Esto garantiza al menos un cero por fila sin alterar la solución óptima.',
      matrix: cloneMatrix(working),
      meta: { rowMins }
    });

    // ---------- Paso 2: reducción por columnas ----------
    const colMins = [];
    for (let j = 0; j < n; j++) {
      let min = Infinity;
      for (let i = 0; i < n; i++) min = Math.min(min, working[i][j]);
      colMins.push(min);
      if (min !== 0) {
        for (let i = 0; i < n; i++) working[i][j] -= min;
      }
    }
    steps.push({
      type: 'col-reduction',
      title: 'Reducción de columnas',
      description: 'Igual que con las filas, se resta el menor valor de cada columna a todos sus elementos, asegurando al menos un cero también por columna.',
      matrix: cloneMatrix(working),
      meta: { colMins }
    });

    // ---------- Bucle: cobertura + ajuste hasta lograr n líneas ----------
    let iteration = 0;
    const maxIterations = 50;
    while (iteration < maxIterations) {
      iteration++;
      const zeroMask = buildZeroMask(working, n);
      const { matchRow, matchCol, size } = maxMatching(zeroMask, n);

      const { coveredRows, coveredCols } = minLineCover(zeroMask, n, matchRow, matchCol);
      const numLines = coveredRows.length + coveredCols.length;

      steps.push({
        type: 'cover',
        title: `Cobertura mínima de ceros (intento ${iteration})`,
        description: `Se cubren todos los ceros de la matriz usando el menor número posible de líneas horizontales y verticales. Se necesitaron ${numLines} línea(s) para cubrir ${n} fila(s)/columna(s) requeridas.`,
        matrix: cloneMatrix(working),
        meta: { coveredRows, coveredCols, numLines, n, matching: matchRow.slice() }
      });

      if (numLines >= n) {
        // Solución óptima alcanzada
        steps.push({
          type: 'optimal',
          title: 'Asignación óptima encontrada',
          description: 'El número de líneas de cobertura es igual al tamaño de la matriz: ya existe una asignación factible usando únicamente ceros independientes (uno por fila y columna).',
          matrix: cloneMatrix(working),
          meta: { matching: matchRow.slice() }
        });

        const assignment = [];
        let totalCost = 0;
        for (let r = 0; r < originalRows; r++) {
          const c = matchRow[r];
          if (c !== -1 && c < originalCols) {
            const cost = inputMatrix[r][c];
            assignment.push({ row: r, col: c, cost });
            totalCost += cost;
          }
        }

        return {
          steps,
          assignment,
          totalCost,
          n,
          originalRows,
          originalCols,
          mode
        };
      }

      // ---------- Ajuste de la matriz (paso clásico del método húngaro) ----------
      let minUncovered = Infinity;
      for (let i = 0; i < n; i++) {
        if (coveredRows.includes(i)) continue;
        for (let j = 0; j < n; j++) {
          if (coveredCols.includes(j)) continue;
          minUncovered = Math.min(minUncovered, working[i][j]);
        }
      }

      for (let i = 0; i < n; i++) {
        for (let j = 0; j < n; j++) {
          const rowCovered = coveredRows.includes(i);
          const colCovered = coveredCols.includes(j);
          if (!rowCovered && !colCovered) {
            working[i][j] -= minUncovered;
          } else if (rowCovered && colCovered) {
            working[i][j] += minUncovered;
          }
        }
      }

      steps.push({
        type: 'adjust',
        title: 'Ajuste de la matriz',
        description: `Se localiza el menor valor no cubierto por ninguna línea (${minUncovered}). Se resta a todos los elementos no cubiertos y se suma a los elementos cubiertos por dos líneas (intersecciones). Los elementos cubiertos por una sola línea permanecen igual.`,
        matrix: cloneMatrix(working),
        meta: { minUncovered, coveredRows, coveredCols }
      });
    }

    throw new Error('No se alcanzó convergencia en el método húngaro (revisar datos de entrada).');
  }

  /** Genera una matriz aleatoria de costos */
  function randomMatrix(rows, cols, min = 1, max = 20) {
    const m = [];
    for (let i = 0; i < rows; i++) {
      const row = [];
      for (let j = 0; j < cols; j++) {
        row.push(Math.floor(Math.random() * (max - min + 1)) + min);
      }
      m.push(row);
    }
    return m;
  }

  return { solve, randomMatrix, cloneMatrix };
})();
