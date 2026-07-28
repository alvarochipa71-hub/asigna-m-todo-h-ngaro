/* ============================================================
   STEPPLAYER.JS — Renderiza y anima la secuencia de pasos
   producida por Hungarian.solve(). Reutilizable en la página
   de teoría (modo demo/autoplay) y en el resolver (interactivo).
   ============================================================ */

class StepPlayer {
  /**
   * @param {object} opts
   *  result          → objeto devuelto por Hungarian.solve()
   *  progressEl      → contenedor del stepper superior
   *  stageMatrixEl   → contenedor de la matriz animada
   *  stageTitleEl, stageDescEl → textos del paso actual
   *  graphSvgEl      → <svg> del grafo bipartito (opcional)
   *  resultsEl       → contenedor de resultados finales (opcional)
   *  rowLabel, colLabel → prefijos para etiquetar filas/columnas
   *  onChange(stepIndex) → callback opcional
   */
  constructor(opts) {
    Object.assign(this, opts);
    this.index = 0;
    this.playing = false;
    this.timer = null;
    this.rowLabel = this.rowLabel || 'F';
    this.colLabel = this.colLabel || 'C';
    this.render();
  }

  get steps() { return this.result.steps; }
  get total() { return this.steps.length; }

  goTo(i) {
    this.index = Math.max(0, Math.min(i, this.total - 1));
    this.render();
    if (this.onChange) this.onChange(this.index);
  }
  next() { if (this.index < this.total - 1) this.goTo(this.index + 1); else this.pause(); }
  prev() { this.goTo(this.index - 1); }

  play() {
    if (this.playing) return;
    this.playing = true;
    this.timer = setInterval(() => {
      if (this.index >= this.total - 1) { this.pause(); return; }
      this.next();
    }, 1600);
  }
  pause() {
    this.playing = false;
    clearInterval(this.timer);
  }
  toggle() { this.playing ? this.pause() : this.play(); }
  restart() { this.pause(); this.goTo(0); }

  /* ---------------------------------------------------------- */
  render() {
    const step = this.steps[this.index];
    const prevStep = this.index > 0 ? this.steps[this.index - 1] : null;
    this.renderProgress();
    this.renderStageText(step);
    this.renderMatrix(step, prevStep);
    if (this.graphSvgEl) this.renderGraph(step);
    if (this.resultsEl) this.renderResults(step);
  }

  renderStageText(step) {
    if (this.stageTitleEl) this.stageTitleEl.textContent = step.title;
    if (this.stageDescEl) this.stageDescEl.textContent = step.description;
  }

  renderProgress() {
    if (!this.progressEl) return;
    const labels = {
      'original': 'Matriz inicial',
      'row-reduction': 'Reducción filas',
      'col-reduction': 'Reducción columnas',
      'cover': 'Cobertura',
      'adjust': 'Ajuste',
      'optimal': 'Óptimo'
    };
    this.progressEl.innerHTML = '';
    this.steps.forEach((s, i) => {
      const node = document.createElement('div');
      node.className = 'progress-node' + (i < this.index ? ' done' : '') + (i === this.index ? ' current' : '');
      node.innerHTML = `<div class="progress-dot">${i < this.index ? '✓' : i + 1}</div><div class="progress-label">${labels[s.type] || s.type}</div>`;
      node.style.cursor = 'pointer';
      node.addEventListener('click', () => this.goTo(i));
      this.progressEl.appendChild(node);
      if (i < this.steps.length - 1) {
        const line = document.createElement('div');
        line.className = 'progress-line' + (i < this.index ? ' done' : '');
        this.progressEl.appendChild(line);
      }
    });
  }

  renderMatrix(step, prevStep) {
    if (!this.stageMatrixEl) return;
    const n = step.matrix.length;
    const matching = (step.meta && step.meta.matching) ? step.meta.matching : null;
    const coveredRows = (step.meta && step.meta.coveredRows) || [];
    const coveredCols = (step.meta && step.meta.coveredCols) || [];
    const isOptimal = step.type === 'optimal';

    const wrap = document.createElement('div');
    wrap.className = 'stage-matrix';
    wrap.style.position = 'relative';

    const table = document.createElement('table');

    // Header row
    const thead = document.createElement('tr');
    thead.appendChild(document.createElement('td'));
    for (let j = 0; j < n; j++) {
      const th = document.createElement('td');
      th.className = 'axis-label';
      th.textContent = `${this.colLabel}${j + 1}`;
      thead.appendChild(th);
    }
    table.appendChild(thead);

    for (let i = 0; i < n; i++) {
      const tr = document.createElement('tr');
      const rowHead = document.createElement('td');
      rowHead.className = 'axis-label';
      rowHead.textContent = `${this.rowLabel}${i + 1}`;
      tr.appendChild(rowHead);

      for (let j = 0; j < n; j++) {
        const td = document.createElement('td');
        const div = document.createElement('div');
        const val = step.matrix[i][j];
        const isZero = Math.abs(val) < 1e-9;
        const isAssigned = isOptimal && matching && matching[i] === j && isZero;
        const changed = prevStep && prevStep.matrix[i][j] !== val;

        div.className = 'cell' +
          (isZero ? ' is-zero' : '') +
          (isAssigned ? ' is-assigned' : '') +
          (changed ? ' is-changed' : '');
        div.textContent = val;
        div.dataset.row = i;
        div.dataset.col = j;
        td.appendChild(div);
        tr.appendChild(td);
      }
      table.appendChild(tr);
    }

    wrap.appendChild(table);
    this.stageMatrixEl.innerHTML = '';
    this.stageMatrixEl.appendChild(wrap);

    // Draw covering lines after layout
    if (coveredRows.length || coveredCols.length) {
      requestAnimationFrame(() => {
        const tableRect = table.getBoundingClientRect();
        coveredRows.forEach(r => {
          const cellDiv = wrap.querySelector(`.cell[data-row="${r}"][data-col="0"]`);
          if (!cellDiv) return;
          const rect = cellDiv.getBoundingClientRect();
          const line = document.createElement('div');
          line.className = 'line-h';
          line.style.top = (rect.top - tableRect.top + rect.height / 2) + 'px';
          line.style.left = '0px';
          line.style.right = '0px';
          line.style.position = 'absolute';
          wrap.appendChild(line);
        });
        coveredCols.forEach(c => {
          const cellDiv = wrap.querySelector(`.cell[data-row="0"][data-col="${c}"]`);
          if (!cellDiv) return;
          const rect = cellDiv.getBoundingClientRect();
          const line = document.createElement('div');
          line.className = 'line-v';
          line.style.left = (rect.left - tableRect.left + rect.width / 2) + 'px';
          line.style.top = '0px';
          line.style.bottom = '0px';
          line.style.position = 'absolute';
          wrap.appendChild(line);
        });
      });
    }
  }

  renderGraph(step) {
    const n = step.matrix.length;
    const svg = this.graphSvgEl;
    const W = 320, H = Math.max(220, n * 64);
    svg.setAttribute('viewBox', `0 0 ${W} ${H}`);
    svg.innerHTML = '';

    const leftX = 56, rightX = W - 56;
    const gap = H / (n + 1);
    const leftY = (i) => gap * (i + 1);
    const rightY = (i) => gap * (i + 1);

    const matching = (step.meta && step.meta.matching) || null;

    // edges
    for (let i = 0; i < n; i++) {
      for (let j = 0; j < n; j++) {
        const val = step.matrix[i][j];
        const isZero = Math.abs(val) < 1e-9;
        const isMatch = matching && matching[i] === j && isZero;
        if (!isZero) continue; // solo dibujamos aristas en ceros para no saturar
        const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
        line.setAttribute('x1', leftX); line.setAttribute('y1', leftY(i));
        line.setAttribute('x2', rightX); line.setAttribute('y2', rightY(j));
        line.setAttribute('class', 'edge-line' + (isMatch ? ' is-match' : ' is-zero-edge'));
        svg.appendChild(line);
      }
    }

    // nodes
    for (let i = 0; i < n; i++) {
      const isMatched = matching && matching[i] !== -1;
      svg.insertAdjacentHTML('beforeend', `
        <circle class="node-circle" cx="${leftX}" cy="${leftY(i)}" r="11" fill="${isMatched ? '#16c98d' : '#3b6df0'}" stroke="#fff" stroke-width="2"/>
        <text class="node-label" x="${leftX - 30}" y="${leftY(i) + 4}">${this.rowLabel}${i + 1}</text>
      `);
    }
    for (let j = 0; j < n; j++) {
      let isMatched = false;
      if (matching) isMatched = matching.includes(j);
      svg.insertAdjacentHTML('beforeend', `
        <circle class="node-circle" cx="${rightX}" cy="${rightY(j)}" r="11" fill="${isMatched ? '#16c98d' : '#f5a524'}" stroke="#fff" stroke-width="2"/>
        <text class="node-label" x="${rightX + 16}" y="${rightY(j) + 4}">${this.colLabel}${j + 1}</text>
      `);
    }
  }

  renderResults(step) {
    if (step.type !== 'optimal') {
      this.resultsEl.classList.remove('show');
      this.resultsEl.style.display = 'none';
      return;
    }
    const { assignment, totalCost, mode } = this.result;
    this.resultsEl.style.display = '';
    this.resultsEl.classList.add('show');

    const rows = assignment.map(a => `
      <tr>
        <td><span class="assign-dot"></span>${this.rowLabel}${a.row + 1}</td>
        <td>→</td>
        <td>${this.colLabel}${a.col + 1}</td>
        <td style="text-align:right">${a.cost}</td>
      </tr>
    `).join('');

    this.resultsEl.innerHTML = `
      <div class="results-banner show">
        <div>
          <div class="label">${mode === 'max' ? 'BENEFICIO TOTAL ÓPTIMO' : 'COSTO TOTAL ÓPTIMO'}</div>
          <div class="big">${totalCost}</div>
        </div>
        <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2"><path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></svg>
      </div>
      <div class="card" style="overflow:hidden">
        <div class="panel-head"><h3>Asignación óptima</h3><span class="sub">${assignment.length} pares</span></div>
        <div style="padding:0 14px 18px">
          <table class="assign-table">
            <thead><tr><th>Origen</th><th></th><th>Destino</th><th style="text-align:right">Costo</th></tr></thead>
            <tbody>${rows}</tbody>
          </table>
        </div>
      </div>
    `;
  }
}
