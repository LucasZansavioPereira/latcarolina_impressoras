const API = '/api/printers';
let printers = [];
let currentStatus = '';
let selectedStatus = 'FUNCIONANDO';

const statusLabel = { FUNCIONANDO: 'Funcionando', QUEBRADA: 'Quebrada', MANUTENCAO: 'Manutenção' };

async function loadPrinters() {
  try {
    const res = await fetch(API);
    printers = await res.json();
    render();
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
    const matchesStatus = !currentStatus || p.status === currentStatus;
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
    card.innerHTML = `
      <div class="card-top">
        <span class="card-codigo">${escapeHtml(p.codigo)}</span>
        <span class="badge ${p.status}">${statusLabel[p.status] || p.status}</span>
      </div>
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
  selectedStatus = p ? p.status : 'FUNCIONANDO';
  updateStatusButtons();
  document.getElementById('btnDelete').style.display = p ? 'flex' : 'none';
  document.getElementById('modalOverlay').classList.add('open');
  document.getElementById('fCodigo').focus();
}

function closeModal() {
  document.getElementById('modalOverlay').classList.remove('open');
}

function updateStatusButtons() {
  document.querySelectorAll('.status-opt').forEach(btn => {
    btn.classList.toggle('selected', btn.dataset.value === selectedStatus);
  });
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

  if (!problema) {
    showToast('Informe o problema / observação');
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
    marcaModelo: document.getElementById('fMarcaModelo').value.trim()
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

loadPrinters();
