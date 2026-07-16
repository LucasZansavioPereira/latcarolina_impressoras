const API = '/api/printers';
let printers = [];
let currentStatus = '';
let selectedStatus = 'FUNCIONANDO';

const statusLabel = { FUNCIONANDO: 'Funcionando', QUEBRADA: 'Quebrada', MANUTENCAO: 'Manutenção' };

const connectivityLabel = {
  ONLINE: { text: '🟢 IP Online', cssClass: 'conn-online' },
  INDISPONIVEL: { text: '🔴 IP Indisponível', cssClass: 'conn-indisponivel' },
  NAO_VERIFICADO: { text: '⚪ Não verificado', cssClass: 'conn-nao-verificado' }
};

function getConnectivityInfo(p) {
  if (!p.ip) return null; // sem IP cadastrado, não exibe status de conectividade
  return connectivityLabel[p.connectivityStatus] || connectivityLabel.NAO_VERIFICADO;
}

async function loadPrinters() {
  try {
    const res = await fetch(API);
    printers = await res.json();
    render();
    renderReport();
  } catch (e) {
    showToast('Erro ao conectar com o servidor');
  }
}

function render() {
  const search = document.getElementById('search').value.toLowerCase();
  const grid = document.getElementById('grid');
  const filtered = printers.filter(p => {
    const matchesSearch = !search ||
      (p.codigo || '').toLowerCase().includes(search) ||
      ((p.setorAntigo || '') + ' ' + (p.setorNovo || '')).toLowerCase().includes(search) ||
      (p.problema || '').toLowerCase().includes(search);
    const matchesStatus = !currentStatus
      || (currentStatus === 'IP_OFFLINE' ? p.connectivityStatus === 'INDISPONIVEL' : p.status === currentStatus);
    return matchesSearch && matchesStatus;
  });

  document.getElementById('statTotal').textContent = printers.length;
  document.getElementById('statOk').textContent = printers.filter(p => p.status === 'FUNCIONANDO').length;
  document.getElementById('statBroken').textContent = printers.filter(p => p.status === 'QUEBRADA').length;
  document.getElementById('statMaint').textContent = printers.filter(p => p.status === 'MANUTENCAO').length;

  document.getElementById('emptyState').style.display = filtered.length === 0 ? 'block' : 'none';
  grid.innerHTML = '';

  filtered.forEach(p => {
    const card = document.createElement('div');
    card.className = `card ${p.status}`;
    const conn = getConnectivityInfo(p);
    card.innerHTML = `
      <div class="card-top">
        <span class="card-codigo">${escapeHtml(p.codigo)}</span>
        <span class="badge ${p.status}">${statusLabel[p.status] || p.status}</span>
      </div>
      ${conn ? `<p class="card-connectivity ${conn.cssClass}">${conn.text}</p>` : ''}
      <p class="card-problema">${escapeHtml(p.problema) || 'Sem observações'}</p>
      <div class="card-meta">
        ${(p.setorAntigo || p.setorNovo) ? `<span><i class="ti ti-map-pin"></i>${escapeHtml(p.setorAntigo || '-')} → ${escapeHtml(p.setorNovo || '-')}</span>` : ''}
        ${p.marcaModelo ? `<span><i class="ti ti-tag"></i>${escapeHtml(p.marcaModelo)}</span>` : ''}
      </div>
    `;
    card.addEventListener('click', () => openModal(p));
    grid.appendChild(card);
  });
}

function escapeHtml(s) {
  return (s || '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}


//tem que funfa
function openModal(p) {
  document.getElementById('modalTitle').textContent = p ? 'Editar impressora' : 'Nova impressora';
  document.getElementById('editId').value = p ? p.id : '';
  document.getElementById('fCodigo').value = p ? p.codigo : '';
  document.getElementById('fProblema').value = p ? (p.problema || '') : '';
  document.getElementById('fSetorAntigo').value = p ? (p.setorAntigo || '') : '';
  document.getElementById('fSetorNovo').value = p ? (p.setorNovo || '') : '';
  document.getElementById('fMarcaModelo').value = p ? (p.marcaModelo || '') : '';
  document.getElementById('fIp').value = p ? (p.ip || '') : '';
  selectedStatus = p ? p.status : 'FUNCIONANDO';
  updateStatusButtons();
  renderConnectivityInfo(p);
  document.getElementById('btnDelete').style.display = p ? 'flex' : 'none';
  document.getElementById('modalOverlay').classList.add('open');
  document.getElementById('fCodigo').focus();
}

function renderConnectivityInfo(p) {
  const wrap = document.getElementById('connInfo');
  const badge = document.getElementById('connBadge');
  const checked = document.getElementById('connChecked');

  // Só exibe o bloco de conectividade ao editar uma impressora que já possua IP cadastrado
  if (!p || !p.ip) {
    wrap.style.display = 'none';
    return;
  }

  wrap.style.display = 'block';
  const conn = connectivityLabel[p.connectivityStatus] || connectivityLabel.NAO_VERIFICADO;
  badge.textContent = conn.text;
  badge.className = `conn-badge ${conn.cssClass}`;
  checked.textContent = p.lastConnectivityCheck
    ? `Última verificação: ${formatDateBr(p.lastConnectivityCheck)}`
    : 'Ainda não verificado';
}

function closeModal() {
  document.getElementById('modalOverlay').classList.remove('open');
}

function updateStatusButtons() {
  document.querySelectorAll('.status-opt').forEach(btn => {
    btn.classList.toggle('selected', btn.dataset.value === selectedStatus);
  });
  updateProblemaRequirement();
}

function updateProblemaRequirement() {
  const isObrigatorio = selectedStatus === 'QUEBRADA';
  document.getElementById('fProblemaReq').style.display = isObrigatorio ? 'inline' : 'none';
  document.getElementById('fProblemaHint').style.display = isObrigatorio ? 'none' : 'block';
}

function showToast(msg) {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.classList.add('show');
  setTimeout(() => t.classList.remove('show'), 2200);
}

document.querySelectorAll('.status-opt').forEach(btn => {
  btn.addEventListener('click', () => {
    selectedStatus = btn.dataset.value;
    updateStatusButtons();
  });
});

document.querySelectorAll('.chip').forEach(chip => {
  chip.addEventListener('click', () => {
    document.querySelectorAll('.chip').forEach(c => c.classList.remove('active'));
    chip.classList.add('active');
    currentStatus = chip.dataset.status;
    render();
  });
});

function formatDateBr(iso) {
  if (!iso) return '';
  try {
    return new Date(iso).toLocaleString('pt-BR');
  } catch (e) {
    return iso;
  }
}

function printerToRow(p) {
  const conn = getConnectivityInfo(p);
  return {
    'Código': p.codigo || '',
    'Status': statusLabel[p.status] || p.status || '',
    'Problema / Observação': p.problema || '',
    'Setor Antigo': p.setorAntigo || '',
    'Setor Novo': p.setorNovo || '',
    'Marca / Modelo': p.marcaModelo || '',
    'Endereço IP': p.ip || '',
    'Conectividade': conn ? conn.text.replace(/^[^\s]+\s/, '') : '',
    'Atualizado em': formatDateBr(p.updatedAt)
  };
}

function autoSizeColumns(rows) {
  if (!rows.length) return [];
  const headers = Object.keys(rows[0]);
  return headers.map(h => {
    const maxLen = rows.reduce((max, row) => Math.max(max, String(row[h] ?? '').length), h.length);
    return { wch: Math.min(Math.max(maxLen + 2, 10), 50) };
  });
}

function addSheet(wb, sheetName, list) {
  const rows = list.map(printerToRow);
  const ws = rows.length
    ? XLSX.utils.json_to_sheet(rows)
    : XLSX.utils.aoa_to_sheet([['Código', 'Status', 'Problema / Observação', 'Setor Antigo', 'Setor Novo', 'Marca / Modelo', 'Atualizado em']]);
  ws['!cols'] = autoSizeColumns(rows.length ? rows : [{ 'Código': '', 'Status': '', 'Problema / Observação': '', 'Setor Antigo': '', 'Setor Novo': '', 'Marca / Modelo': '', 'Atualizado em': '' }]);
  XLSX.utils.book_append_sheet(wb, ws, sheetName);
}

function exportToExcel() {
  if (!printers.length) {
    showToast('Não há impressoras para exportar');
    return;
  }

  const wb = XLSX.utils.book_new();

  addSheet(wb, 'Todas', printers);
  addSheet(wb, 'Funcionando', printers.filter(p => p.status === 'FUNCIONANDO'));
  addSheet(wb, 'Manutenção', printers.filter(p => p.status === 'MANUTENCAO'));
  addSheet(wb, 'Quebradas', printers.filter(p => p.status === 'QUEBRADA'));

  const date = new Date().toISOString().slice(0, 10);
  XLSX.writeFile(wb, `impressoras_${date}.xlsx`);
  showToast('Planilha exportada com sucesso');
}

document.getElementById('btnExport').addEventListener('click', exportToExcel);

// ---------- Importar Excel ----------

function normalizeText(s) {
  return String(s ?? '')
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '') // remove acentos
    .toLowerCase()
    .replace(/[_\-\/]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

const HEADER_ALIASES = {
  codigo: ['codigo', 'código', 'codigo serial', 'numero de serie', 'número de série', 'serial', 'code', 'cod', 'numero serial', 'número serial', 'num serial', 'n serial', 'nº serial', 'serie', 'série', 'serial number', 'numero de serie completo'],
  status: ['status', 'situacao', 'situação', 'estado'],
  problema: ['problema', 'problema observacao', 'observacao', 'observação', 'obs', 'descricao', 'descrição', 'defeito'],
  setorAntigo: ['setor antigo', 'setor origem', 'local antigo', 'setor anterior', 'origem'],
  setorNovo: ['setor novo', 'setor atual', 'setor', 'local', 'localizacao', 'localização', 'destino'],
  marcaModelo: ['marca modelo', 'marca', 'modelo', 'fabricante'],
  ip: ['ip', 'endereco ip', 'endereço ip', 'ip address']
};

const STATUS_ALIASES = {
  FUNCIONANDO: ['funcionando', 'ok', 'ativa', 'ativo', 'normal', 'funciona', 'operante', 'operacional'],
  QUEBRADA: ['quebrada', 'quebrado', 'defeito', 'com defeito', 'danificada', 'danificado', 'parada', 'parado', 'quebradas'],
  MANUTENCAO: ['manutencao', 'manutenção', 'em manutencao', 'em manutenção', 'revisao', 'revisão']
};

function normalizeStatus(value) {
  const v = normalizeText(value);
  if (!v) return 'FUNCIONANDO';
  for (const [status, aliases] of Object.entries(STATUS_ALIASES)) {
    if (aliases.some(a => v === a || v.includes(a))) return status;
  }
  return 'FUNCIONANDO';
}

function buildHeaderMap(row) {
  // row: primeiro objeto de dados da planilha (chaves = cabeçalhos originais)
  const map = {}; // field -> [colunas originais correspondentes]
  const unmatched = [];

  Object.keys(row).forEach(originalHeader => {
    const norm = normalizeText(originalHeader);
    if (!norm) return; // cabeçalho vazio/em branco: não há como reconhecer o campo
    let matched = false;
    for (const [field, aliases] of Object.entries(HEADER_ALIASES)) {
      if (aliases.includes(norm)) {
        if (!map[field]) map[field] = [];
        map[field].push(originalHeader);
        matched = true;
      }
    }
    if (!matched) unmatched.push({ originalHeader, norm });
  });

  // Fallback: para cabeçalhos que não bateram exatamente com nenhum alias,
  // tenta correspondência parcial (ex.: "Nº de Série Completo" contém "serie").
  unmatched.forEach(({ originalHeader, norm }) => {
    for (const [field, aliases] of Object.entries(HEADER_ALIASES)) {
      // Exige pelo menos 4 caracteres no termo comparado para evitar falsos positivos
      // (ex.: "obs" não deve casar com "Centro Obstétrico").
      const isPartialMatch = aliases.some(a =>
        (a.length >= 4 && norm.includes(a)) || (norm.length >= 4 && a.includes(norm))
      );
      if (isPartialMatch) {
        if (!map[field]) map[field] = [];
        map[field].push(originalHeader);
        break; // usa o primeiro campo compatível para evitar ambiguidade
      }
    }
  });

  return map;
}

function rowToPrinter(row, headerMap) {
  const getValue = (field) => {
    const cols = headerMap[field];
    if (!cols || !cols.length) return '';
    return cols
      .map(c => (row[c] !== undefined && row[c] !== null) ? String(row[c]).trim() : '')
      .filter(Boolean)
      .join(' ');
  };

  const codigo = getValue('codigo');
  if (!codigo) return null;

  return {
    codigo,
    status: normalizeStatus(getValue('status')),
    problema: getValue('problema'),
    setorAntigo: getValue('setorAntigo'),
    setorNovo: getValue('setorNovo'),
    marcaModelo: getValue('marcaModelo'),
    ip: getValue('ip')
  };
}

function extractPrintersFromWorkbook(workbook) {
  const byCodigo = new Map();

  workbook.SheetNames.forEach(sheetName => {
    const sheet = workbook.Sheets[sheetName];
    const rows = XLSX.utils.sheet_to_json(sheet, { defval: '' });
    if (!rows.length) return;

    const headerMap = buildHeaderMap(rows[0]);
    if (!headerMap.codigo) return; // planilha sem coluna de código reconhecível

    rows.forEach(row => {
      const printer = rowToPrinter(row, headerMap);
      if (printer) byCodigo.set(printer.codigo, printer);
    });
  });

  return Array.from(byCodigo.values());
}

async function importPrinters(list) {
  const existingCodigos = new Set(printers.map(p => (p.codigo || '').trim()));
  const toCreate = list.filter(p => !existingCodigos.has(p.codigo));
  const skipped = list.length - toCreate.length;

  let success = 0;
  let failed = 0;

  for (const printer of toCreate) {
    try {
      const res = await fetch(API, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(printer)
      });
      if (res.ok) success++; else failed++;
    } catch (e) {
      failed++;
    }
  }

  await loadPrinters();

  const parts = [`${success} adicionada(s)`];
  if (skipped > 0) parts.push(`${skipped} já existente(s) ignorada(s)`);
  if (failed > 0) parts.push(`${failed} com erro`);
  showToast(`Importação concluída: ${parts.join(', ')}`);
}

document.getElementById('btnImport').addEventListener('click', () => {
  document.getElementById('importFile').click();
});

document.getElementById('importFile').addEventListener('change', async (e) => {
  const file = e.target.files[0];
  if (!file) return;

  try {
    const data = await file.arrayBuffer();
    const workbook = XLSX.read(data, { type: 'array' });
    const list = extractPrintersFromWorkbook(workbook);

    if (!list.length) {
      showToast('Nenhuma impressora reconhecida no arquivo. Verifique as colunas.');
      return;
    }

    if (!confirm(`Foram encontradas ${list.length} impressora(s) no arquivo. Deseja importar?`)) {
      return;
    }

    showToast('Importando...');
    await importPrinters(list);
  } catch (err) {
    showToast('Erro ao ler o arquivo. Verifique se é um Excel válido.');
  } finally {
    e.target.value = '';
  }
});

document.getElementById('btnNew').addEventListener('click', () => openModal(null));
document.getElementById('btnClose').addEventListener('click', closeModal);
document.getElementById('btnCancel').addEventListener('click', closeModal);
document.getElementById('modalOverlay').addEventListener('click', (e) => {
  if (e.target.id === 'modalOverlay') closeModal();
});
document.getElementById('search').addEventListener('input', render);

document.getElementById('btnSave').addEventListener('click', async () => {
  const codigo = document.getElementById('fCodigo').value.trim();
  const problema = document.getElementById('fProblema').value.trim();
  const setorAntigo = document.getElementById('fSetorAntigo').value.trim();
  const setorNovo = document.getElementById('fSetorNovo').value.trim();

  if (!codigo) {
    showToast('Informe o código da impressora');
    document.getElementById('fCodigo').focus();
    return;
  }

  if (selectedStatus === 'QUEBRADA' && !problema) {
    showToast('Informe o problema da impressora quebrada');
    document.getElementById('fProblema').focus();
    return;
  }

  if (!setorAntigo) {
    showToast('Informe o setor antigo');
    document.getElementById('fSetorAntigo').focus();
    return;
  }

  if (!setorNovo) {
    showToast('Informe o setor novo');
    document.getElementById('fSetorNovo').focus();
    return;
  }

  const id = document.getElementById('editId').value;
  const payload = {
    codigo,
    status: selectedStatus,
    problema,
    setorAntigo,
    setorNovo,
    marcaModelo: document.getElementById('fMarcaModelo').value.trim(),
    ip: document.getElementById('fIp').value.trim()
  };

  try {
    const res = await fetch(id ? `${API}/${id}` : API, {
      method: id ? 'PUT' : 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    if (!res.ok) throw new Error('Falha ao salvar');
    closeModal();
    showToast(id ? 'Impressora atualizada' : 'Impressora cadastrada');
    loadPrinters();
  } catch (e) {
    showToast('Erro ao salvar. Tente novamente.');
  }
});

async function checkAllIps(btn) {
  const comIp = printers.filter(p => p.ip && p.ip.trim()).length;

  if (comIp === 0) {
    showToast('Nenhuma impressora com IP cadastrado para verificar');
    return;
  }

  const originalHtml = btn.innerHTML;
  btn.disabled = true;
  btn.innerHTML = `<i class="ti ti-loader-2 spin"></i>Verificando ${comIp} impressora(s)...`;

  try {
    const res = await fetch(`${API}/verificar-conectividade`, { method: 'POST' });
    if (!res.ok) throw new Error('Falha ao verificar');
    printers = await res.json();
    render();
    renderReport();

    const online = printers.filter(p => p.ip && p.connectivityStatus === 'ONLINE').length;
    const offline = printers.filter(p => p.ip && p.connectivityStatus === 'INDISPONIVEL').length;
    showToast(`Verificação concluída: 🟢 ${online} online, 🔴 ${offline} indisponível(is)`);
  } catch (e) {
    showToast('Erro ao verificar conectividade das impressoras');
  } finally {
    btn.disabled = false;
    btn.innerHTML = originalHtml;
  }
}

document.getElementById('btnCheckAll').addEventListener('click', (e) => checkAllIps(e.currentTarget));
document.getElementById('btnCheckAllReport').addEventListener('click', (e) => checkAllIps(e.currentTarget));

document.getElementById('btnCheckNow').addEventListener('click', async () => {
  const id = document.getElementById('editId').value;
  if (!id) return;
  const btn = document.getElementById('btnCheckNow');
  btn.disabled = true;
  try {
    const res = await fetch(`${API}/${id}/verificar-conectividade`, { method: 'POST' });
    if (!res.ok) throw new Error('Falha ao verificar');
    const updated = await res.json();
    renderConnectivityInfo(updated);
    const idx = printers.findIndex(pr => pr.id === updated.id);
    if (idx !== -1) printers[idx] = updated;
    render();
    renderReport();
    showToast('Conectividade verificada');
  } catch (e) {
    showToast('Erro ao verificar conectividade');
  } finally {
    btn.disabled = false;
  }
});

document.getElementById('btnDelete').addEventListener('click', async () => {
  const id = document.getElementById('editId').value;
  if (!id) return;
  if (!confirm('Excluir esta impressora do registro?')) return;
  try {
    const res = await fetch(`${API}/${id}`, { method: 'DELETE' });
    if (!res.ok) throw new Error('Falha ao excluir');
    closeModal();
    showToast('Impressora excluída');
    loadPrinters();
  } catch (e) {
    showToast('Erro ao excluir. Tente novamente.');
  }
});

// ---------- Navegação entre abas (Impressoras / Relatório dos IPs) ----------

function switchView(view) {
  document.getElementById('mainView').style.display = view === 'main' ? 'block' : 'none';
  document.getElementById('reportView').style.display = view === 'report' ? 'block' : 'none';
  document.getElementById('navPrinters').classList.toggle('active', view === 'main');
  document.getElementById('navReport').classList.toggle('active', view === 'report');
  if (view === 'report') renderReport();
}

document.getElementById('navPrinters').addEventListener('click', () => switchView('main'));
document.getElementById('navReport').addEventListener('click', () => switchView('report'));
document.getElementById('reportSearch').addEventListener('input', renderReport);

function renderReport() {
  const tbody = document.getElementById('reportTableBody');
  const emptyState = document.getElementById('reportEmptyState');
  if (!tbody) return; // view ainda não carregada

  const search = document.getElementById('reportSearch').value.toLowerCase();
  const comIp = printers.filter(p => p.ip && p.ip.trim());

  const filtered = comIp.filter(p => {
    if (!search) return true;
    return (p.codigo || '').toLowerCase().includes(search)
      || ((p.setorAntigo || '') + ' ' + (p.setorNovo || '')).toLowerCase().includes(search)
      || (p.ip || '').toLowerCase().includes(search);
  });

  document.getElementById('repTotal').textContent = comIp.length;
  document.getElementById('repOnline').textContent = comIp.filter(p => p.connectivityStatus === 'ONLINE').length;
  document.getElementById('repOffline').textContent = comIp.filter(p => p.connectivityStatus === 'INDISPONIVEL').length;
  document.getElementById('repPending').textContent = comIp.filter(p => !p.connectivityStatus || p.connectivityStatus === 'NAO_VERIFICADO').length;

  emptyState.style.display = filtered.length === 0 ? 'block' : 'none';
  tbody.innerHTML = '';

  filtered
    .slice()
    .sort((a, b) => (a.codigo || '').localeCompare(b.codigo || ''))
    .forEach(p => {
      const conn = connectivityLabel[p.connectivityStatus] || connectivityLabel.NAO_VERIFICADO;
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td class="rt-codigo">${escapeHtml(p.codigo)}</td>
        <td class="rt-setor">${escapeHtml(p.setorNovo || p.setorAntigo || '-')}</td>
        <td><span class="badge ${p.status}">${statusLabel[p.status] || p.status}</span></td>
        <td class="rt-ip">${escapeHtml(p.ip)}</td>
        <td><span class="rt-conn ${conn.cssClass}">${conn.text}</span></td>
        <td class="rt-checked">${p.lastConnectivityCheck ? formatDateBr(p.lastConnectivityCheck) : 'Nunca verificado'}</td>
      `;
      tr.addEventListener('click', () => openModal(p));
      tbody.appendChild(tr);
    });
}

loadPrinters();
