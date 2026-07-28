/* ============================================================
   RESOLVER.JS — controla la página interactiva de resolución
   ============================================================ */

(() => {
  const rowsInput = document.getElementById('rows-input');
  const colsInput = document.getElementById('cols-input');
  const matrixWrap = document.getElementById('matrix-input-wrap');
  const modeMinBtn = document.getElementById('mode-min');
  const modeMaxBtn = document.getElementById('mode-max');
  const btnRandom = document.getElementById('btn-random');
  const btnSolve = document.getElementById('btn-solve');
  const btnPrev = document.getElementById('btn-prev');
  const btnNext = document.getElementById('btn-next');
  const btnPlay = document.getElementById('btn-play');
  const statusPill = document.getElementById('status-pill');

  const progressEl = document.getElementById('progress-track');
  const stageTitleEl = document.getElementById('stage-title');
  const stageDescEl = document.getElementById('stage-desc');
  const stageMatrixEl = document.getElementById('stage-matrix');
  const graphSvgEl = document.getElementById('graph-svg');
  const resultsArea = document.getElementById('results-area');

  let mode = 'min';
  let player = null;

  const EXAMPLES = {
    ops3: {
      rows: 3, cols: 3, mode: 'min',
      matrix: [[9, 11, 14], [6, 15, 13], [12, 13, 6]]
    },
    zonas4: {
      rows: 4, cols: 4, mode: 'max',
      matrix: [[24, 18, 30, 22], [20, 25, 19, 28], [27, 21, 26, 24], [22, 29, 23, 30]]
    },
    rect23: {
      rows: 2, cols: 3, mode: 'min',
      matrix: [[8, 6, 12], [9, 7, 5]]
    }
  };

  /* ---------------- Matriz de entrada (editable) ---------------- */
  function buildMatrixInput(rows, cols, prefill = null) {
    const table = document.createElement('table');
    table.className = 'matrix-table';

    const thead = document.createElement('tr');
    thead.appendChild(document.createElement('th'));
    for (let j = 0; j < cols; j++) {
      const th = document.createElement('th');
      th.textContent = `T${j + 1}`;
      thead.appendChild(th);
    }
    table.appendChild(thead);

    for (let i = 0; i < rows; i++) {
      const tr = document.createElement('tr');
      const label = document.createElement('td');
      label.className = 'row-label';
      label.textContent = `O${i + 1}`;
      tr.appendChild(label);
      for (let j = 0; j < cols; j++) {
        const td = document.createElement('td');
        const input = document.createElement('input');
        input.type = 'number';
        input.className = 'cell-input';
        input.min = '0';
        input.value = prefill ? prefill[i][j] : Math.floor(Math.random() * 18) + 2;
        input.dataset.row = i;
        input.dataset.col = j;
        td.appendChild(input);
        tr.appendChild(td);
      }
      table.appendChild(tr);
    }

    matrixWrap.innerHTML = '';
    matrixWrap.appendChild(table);
  }

  function readMatrixInput() {
    const rows = parseInt(rowsInput.value, 10);
    const cols = parseInt(colsInput.value, 10);
    const matrix = [];
    for (let i = 0; i < rows; i++) {
      const row = [];
      for (let j = 0; j < cols; j++) {
        const input = matrixWrap.querySelector(`input[data-row="${i}"][data-col="${j}"]`);
        row.push(parseFloat(input.value) || 0);
      }
      matrix.push(row);
    }
    return matrix;
  }

  function randomizeMatrix() {
    matrixWrap.querySelectorAll('.cell-input').forEach(input => {
      input.value = Math.floor(Math.random() * 18) + 2;
    });
    showToast('Matriz aleatoria generada', '🎲');
  }

  /* ---------------- Controles de modo ---------------- */
  modeMinBtn.addEventListener('click', () => {
    mode = 'min';
    modeMinBtn.classList.add('active');
    modeMaxBtn.classList.remove('active');
  });
  modeMaxBtn.addEventListener('click', () => {
    mode = 'max';
    modeMaxBtn.classList.add('active');
    modeMinBtn.classList.remove('active');
  });

  /* ---------------- Tamaño de matriz ---------------- */
  function refreshMatrixSize() {
    buildMatrixInput(parseInt(rowsInput.value, 10), parseInt(colsInput.value, 10));
  }
  rowsInput.addEventListener('change', refreshMatrixSize);
  colsInput.addEventListener('change', refreshMatrixSize);

  btnRandom.addEventListener('click', randomizeMatrix);

  /* ---------------- Resolver ---------------- */
  function setControlsEnabled(enabled) {
    btnPrev.disabled = !enabled;
    btnNext.disabled = !enabled;
    btnPlay.disabled = !enabled;
  }

  function solveCurrent() {
    const matrix = readMatrixInput();
    let result;
    try {
      result = Hungarian.solve(matrix, mode);
    } catch (e) {
      showToast('No se pudo resolver: revisa los datos', '⚠️');
      console.error(e);
      return;
    }

    if (player) player.pause();

    player = new StepPlayer({
      result,
      progressEl,
      stageTitleEl,
      stageDescEl,
      stageMatrixEl,
      graphSvgEl,
      resultsEl: resultsArea,
      rowLabel: 'O',
      colLabel: 'T',
      onChange: (i) => {
        const step = result.steps[i];
        statusPill.textContent = step.type === 'optimal' ? 'Solución óptima' : `Paso ${i + 1} de ${result.steps.length}`;
        btnPrev.disabled = i === 0;
        const isLast = i === result.steps.length - 1;
        btnNext.disabled = isLast;
        if (isLast) player.pause();
      }
    });

    setControlsEnabled(true);
    statusPill.textContent = `Paso 1 de ${result.steps.length}`;
    btnPrev.disabled = true;
    btnNext.disabled = result.steps.length <= 1;
    showToast('Resolviendo con el método húngaro…', '⚙️');
  }

  btnSolve.addEventListener('click', solveCurrent);
  btnPrev.addEventListener('click', () => player && player.prev());
  btnNext.addEventListener('click', () => player && player.next());
  btnPlay.addEventListener('click', () => {
    if (!player) return;
    player.toggle();
    btnPlay.innerHTML = player.playing
      ? '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="6" y="5" width="4" height="14"/><rect x="14" y="5" width="4" height="14"/></svg> Pausar'
      : '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M5 3l14 9-14 9V3z"/></svg> Reproducir';
  });

  /* ---------------- Ejemplos ---------------- */
  document.querySelectorAll('.example-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const ex = EXAMPLES[btn.dataset.example];
      rowsInput.value = ex.rows;
      colsInput.value = ex.cols;
      mode = ex.mode;
      if (mode === 'max') { modeMaxBtn.click(); } else { modeMinBtn.click(); }
      buildMatrixInput(ex.rows, ex.cols, ex.matrix);
      window.scrollTo({ top: 0, behavior: 'smooth' });
      showToast('Ejemplo cargado, presiona "Resolver"', '📋');
    });
  });

  /* ---------------- Init ---------------- */
  buildMatrixInput(3, 3, EXAMPLES.ops3.matrix);
})();
