const API = '/api/printers';
const AUTH_API = '/api/auth';
let printers = [];
let currentStatus = '';
let selectedStatus = 'FUNCIONANDO';
let loggedUsername = '';

let appElement;
let loginScreen;
let userScreen;
let loginUsername;
let loginPassword;
let currentUsername;
let editUsernameCurrent;
let editCurrentPassword;
let editNewPassword;
let newUserUsername;
let newUserPassword;
let userManagementTopButton;
let userManagementSideButton;
let userListElement;
let createUserSection;

const statusLabel = { FUNCIONANDO: 'Funcionando', QUEBRADA: 'Quebrada', MANUTENCAO: 'Manutenção', BACKUP: 'Backup' };

const connectivityLabel = {
  ONLINE: { text: '🟢 IP Online', cssClass: 'conn-online' },
  INDISPONIVEL: { text: '🔴 IP Indisponível', cssClass: 'conn-indisponivel' },
  NAO_VERIFICADO: { text: '⚪ Não verificado', cssClass: 'conn-nao-verificado' }
};

function getConnectivityInfo(p) {
  if (!p.ip) return null;
  if (p.connectionType === 'USB') return null;
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
  document.getElementById('statBackup').textContent = printers.filter(p => p.status === 'BACKUP').length;

  document.getElementById('emptyState').style.display = filtered.length === 0 ? 'block' : 'none';
  grid.innerHTML = '';

  filtered.forEach(p => {
    const card = document.createElement('div');
    card.className = `card ${p.status}`;
    const conn = getConnectivityInfo(p);
    card.innerHTML = `
      <div class="card-top">
        <span class="card-codigo">${escapeHtml(p.codigo)}</span>
        <div style="display:flex;align-items:center;gap:8px;">
          <span class="badge ${p.status}">${statusLabel[p.status] || p.status}</span>
          <span class="conn-type ${p.connectionType === 'USB' ? 'usb' : 'ethernet'}">${p.connectionType === 'USB' ? 'USB' : 'Ethernet'}</span>
        </div>
      </div>
      ${conn ? `<p class="card-connectivity ${conn.cssClass}">${conn.text}</p>` : ''}
      <p class="card-problema">${escapeHtml(p.problema) || 'Sem observações'}</p>
      <div class="card-meta">
        ${(p.setorAntigo || p.setorNovo) ? `<span><i class="ti ti-map-pin"></i>${escapeHtml(p.setorAntigo || '-') } → ${escapeHtml(p.setorNovo || '-')}</span>` : ''}
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

function openModal(p) {
  document.getElementById('modalTitle').textContent = p ? 'Editar impressora' : 'Nova impressora';
  document.getElementById('editId').value = p ? p.id : '';
  document.getElementById('fCodigo').value = p ? p.codigo : '';
  document.getElementById('fProblema').value = p ? (p.problema || '') : '';
  document.getElementById('fSetorAntigo').value = p ? (p.setorAntigo || '') : '';
  document.getElementById('fSetorNovo').value = p ? (p.setorNovo || '') : '';
  document.getElementById('fMarcaModelo').value = p ? (p.marcaModelo || '') : '';
  document.getElementById('fIp').value = p ? (p.ip || '') : '';
  setConnectionButtons(p ? (p.connectionType || 'ETHERNET') : 'ETHERNET');
  selectedStatus = p ? p.status : 'FUNCIONANDO';
  updateStatusButtons();
  renderConnectivityInfo(p);
  updateConnectionFieldsUI();
  document.getElementById('btnDelete').style.display = p ? 'flex' : 'none';
  document.getElementById('modalOverlay').classList.add('open');
  document.getElementById('fCodigo').focus();
}

function renderConnectivityInfo(p) {
  const wrap = document.getElementById('connInfo');
  const badge = document.getElementById('connBadge');
  const checked = document.getElementById('connChecked');

  if (!p || !p.ip || p.connectionType === 'USB') {
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

function getSelectedConnectionType() {
  const btn = document.querySelector('#fConnectionTypeGroup .status-opt.selected');
  return btn ? btn.dataset.connection : 'ETHERNET';
}

function setConnectionButtons(type) {
  document.querySelectorAll('#fConnectionTypeGroup .status-opt').forEach(b => b.classList.toggle('selected', b.dataset.connection === type));
}

function updateConnectionFieldsUI() {
  const type = getSelectedConnectionType();
  const macGroup = document.getElementById('formGroupMac');
  const ipGroup = document.getElementById('formGroupIp');
  const ipReq = document.getElementById('fIpReq');
  const macReq = document.getElementById('fMacReq');
  const connInfo = document.getElementById('connInfo');

  if (type === 'USB') {
    macGroup.style.display = 'none';
    ipGroup.style.display = 'none';
    ipReq.style.display = 'none';
    macReq.style.display = 'none';
    connInfo.style.display = 'none';
  } else {
    macGroup.style.display = 'block';
    ipGroup.style.display = 'block';
    ipReq.style.display = 'inline';
    macReq.style.display = 'inline';
  }
}

function closeModal() {
  document.getElementById('modalOverlay').classList.remove('open');
}

function updateStatusButtons() {
  document.querySelectorAll('#fStatusGroup .status-opt').forEach(btn => {
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

function getPrinterPayload() {
  const codigo = document.getElementById('fCodigo').value.trim();
  const problema = document.getElementById('fProblema').value.trim();
  const setorAntigo = document.getElementById('fSetorAntigo').value.trim();
  const setorNovo = document.getElementById('fSetorNovo').value.trim();
  const marcaModelo = document.getElementById('fMarcaModelo').value.trim();
  const ip = document.getElementById('fIp').value.trim();
  const connectionType = getSelectedConnectionType();

  const payload = {
    codigo,
    status: selectedStatus,
    problema,
    setorAntigo,
    setorNovo,
    marcaModelo,
    connectionType
  };

  if (connectionType === 'USB') {
    payload.ip = null;
    payload.marcaModelo = null;
  } else {
    payload.ip = ip;
    payload.marcaModelo = marcaModelo;
  }

  return payload;
}

async function savePrinter() {
  const id = document.getElementById('editId').value;
  const payload = getPrinterPayload();

  if (!payload.codigo) {
    showToast('Digite o nome da impressora');
    return;
  }

  if (!payload.setorAntigo || !payload.setorNovo) {
    showToast('Preencha os campos de localização e setor');
    return;
  }

  if (payload.status === 'QUEBRADA' && !payload.problema) {
    showToast('Descreva o problema para impressoras quebradas');
    return;
  }

  if (payload.connectionType === 'ETHERNET') {
    if (!payload.ip) {
      showToast('Informe o endereço IP para conexão Ethernet');
      return;
    }
    if (!payload.marcaModelo) {
      showToast('Informe o endereço MAC para conexão Ethernet');
      return;
    }
  }

  const btn = document.getElementById('btnSave');
  const originalHtml = btn.innerHTML;
  btn.disabled = true;
  btn.innerHTML = '<i class="ti ti-loader-2 spin"></i>Salvando...';

  try {
    const res = await fetch(id ? `${API}/${id}` : API, {
      method: id ? 'PUT' : 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    if (!res.ok) {
      const error = await res.json().catch(() => ({}));
      throw new Error(error.erro || 'Falha ao salvar impressora');
    }

    closeModal();
    showToast(id ? 'Impressora atualizada com sucesso' : 'Impressora cadastrada com sucesso');
    await loadPrinters();
  } catch (e) {
    showToast(e.message);
  } finally {
    btn.disabled = false;
    btn.innerHTML = originalHtml;
  }
}

function showUserScreen() {
  loginScreen.style.display = 'none';
  userScreen.style.display = 'flex';
  appElement.classList.add('hidden');
  editUsernameCurrent.value = loggedUsername || '';
  editCurrentPassword.value = '';
  editNewPassword.value = '';
  newUserUsername.value = '';
  newUserPassword.value = '';
  createUserSection.style.display = 'block';
  loadUsers();
}

async function loadUsers() {
  if (!userListElement) return;
  userListElement.innerHTML = '<div class="empty-list">Carregando usuários...</div>';
  if (!userListElement) return;
  try {
    const res = await fetch(`${AUTH_API}/users`);
    if (!res.ok) throw new Error('Falha ao carregar usuários');
    const users = await res.json();
    renderUserList(users);
  } catch (e) {
    userListElement.innerHTML = '<div class="empty-list">Não foi possível carregar usuários</div>';
  }
}

function renderUserList(users) {
  if (!userListElement) return;
  const sorted = (users || []).slice().sort((a, b) => (a.username || '').localeCompare(b.username || ''));
  userListElement.innerHTML = sorted.length
    ? sorted.map(user => `
      <div class="user-list-item${user.username === loggedUsername ? ' current' : ''}" data-username="${escapeHtml(user.username)}">
        <span>${escapeHtml(user.username)}</span>
        <div class="user-list-actions">
          ${user.username === loggedUsername ? '<span class="user-list-current">atual</span>' : '<button type="button" class="btn-danger-small user-delete-btn" title="Excluir usuário"><i class="ti ti-trash"></i>Excluir</button>'}
        </div>
      </div>
    `).join('')
    : '<div class="empty-list">Nenhum usuário cadastrado</div>';
}

async function deleteUser(username) {
  if (!username) return;
  if (username === loggedUsername) {
    showToast('Não é possível excluir o usuário atual');
    return;
  }
  if (!confirm(`Excluir o usuário "${username}"?`)) return;

  try {
    const res = await fetch(`${AUTH_API}/users/${encodeURIComponent(username)}`, {
      method: 'DELETE'
    });
    if (!res.ok) throw new Error('Falha ao excluir usuário');
    showToast('Usuário excluído com sucesso');
    loadUsers();
  } catch (e) {
    showToast(e.message);
  }
}

function showAppScreen() {
  loginScreen.style.display = 'none';
  userScreen.style.display = 'none';
  appElement.classList.remove('hidden');
}

function completeLogin() {
  loginScreen.style.display = 'none';
  userScreen.style.display = 'none';
  appElement.classList.remove('hidden');
  currentUsername.textContent = loggedUsername || '-';
  editUsernameCurrent.value = loggedUsername || '';
  loginUsername.value = '';
  loginPassword.value = '';
  loadPrinters();
  loadUsers();
}

async function login() {
  const username = loginUsername.value.trim();
  const password = loginPassword.value.trim();
  if (!username || !password) {
    showToast('Digite usuário e senha');
    return;
  }

  try {
    const res = await fetch(`${AUTH_API}/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password })
    });
    if (!res.ok) {
      const error = await res.json();
      throw new Error(error.erro || 'Falha ao fazer login');
    }
    const data = await res.json();
    loggedUsername = data.username;
    completeLogin();
  } catch (e) {
    showToast(e.message);
  }
}

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
    'Nome': p.codigo || '',
    'Status': statusLabel[p.status] || p.status || '',
    'Problema / Observação': p.problema || '',
    'Localização': p.setorAntigo || '',
    'Setor': p.setorNovo || '',
    'Endereço MAC': p.marcaModelo || '',
    'Tipo de conexão': p.connectionType || '',
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
    : XLSX.utils.aoa_to_sheet([['Nome','Status','Problema / Observação','Localização','Setor','Endereço MAC','Tipo de conexão','Endereço IP','Conectividade','Atualizado em']]);
  ws['!cols'] = autoSizeColumns(rows.length ? rows : [{ 'Nome': '', 'Status': '', 'Problema / Observação': '', 'Localização': '', 'Setor': '', 'Endereço MAC': '', 'Tipo de conexão': '', 'Endereço IP': '', 'Conectividade': '', 'Atualizado em': '' }]);
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
  addSheet(wb, 'Backup', printers.filter(p => p.status === 'BACKUP'));

  const date = new Date().toISOString().slice(0, 10);
  XLSX.writeFile(wb, `impressoras_${date}.xlsx`);
  showToast('Planilha exportada com sucesso');
}

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

function switchView(view) {
  document.getElementById('mainView').style.display = view === 'main' ? 'block' : 'none';
  document.getElementById('reportView').style.display = view === 'report' ? 'block' : 'none';
  document.getElementById('navPrinters').classList.toggle('active', view === 'main');
  document.getElementById('navReport').classList.toggle('active', view === 'report');
  if (view === 'report') renderReport();
}

function renderReport() {
  const tbody = document.getElementById('reportTableBody');
  const emptyState = document.getElementById('reportEmptyState');
  if (!tbody) return;

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
        <td class="rt-conn-type"><span class="conn-type ${p.connectionType === 'USB' ? 'usb' : 'ethernet'}">${p.connectionType === 'USB' ? 'USB' : 'Ethernet'}</span></td>
        <td><span class="badge ${p.status}">${statusLabel[p.status] || p.status}</span></td>
        <td class="rt-ip">${escapeHtml(p.ip)}</td>
        <td><span class="rt-conn ${conn.cssClass}">${conn.text}</span></td>
        <td class="rt-checked">${p.lastConnectivityCheck ? formatDateBr(p.lastConnectivityCheck) : 'Nunca verificado'}</td>
      `;
      tr.addEventListener('click', () => openModal(p));
      tbody.appendChild(tr);
    });
}

function init() {
  appElement = document.querySelector('.app');
  loginScreen = document.getElementById('loginScreen');
  userScreen = document.getElementById('userScreen');
  loginUsername = document.getElementById('loginUsername');
  loginPassword = document.getElementById('loginPassword');
  currentUsername = document.getElementById('currentUsername');
  editUsernameCurrent = document.getElementById('editUsernameCurrent');
  editCurrentPassword = document.getElementById('editCurrentPassword');
  editNewPassword = document.getElementById('editNewPassword');
  newUserUsername = document.getElementById('newUserUsername');
  newUserPassword = document.getElementById('newUserPassword');
  userManagementTopButton = document.getElementById('btnUserManagementTop');
  userManagementSideButton = document.getElementById('btnUserManagementSide');
  userListElement = document.getElementById('userList');
  createUserSection = document.getElementById('createUserSection');

  if (userListElement) {
    userListElement.addEventListener('click', (e) => {
      const btn = e.target.closest('.user-delete-btn');
      if (!btn) return;
      const item = btn.closest('.user-list-item');
      if (!item) return;
      deleteUser(item.dataset.username);
    });
  }

  document.getElementById('btnLogin').addEventListener('click', login);
  if (userManagementTopButton) {
    userManagementTopButton.addEventListener('click', showUserScreen);
  }
  if (userManagementSideButton) {
    userManagementSideButton.addEventListener('click', showUserScreen);
  }
  document.getElementById('btnBackToLogin').addEventListener('click', showAppScreen);
  document.getElementById('btnSaveUser').addEventListener('click', async () => {
    const currentPassword = editCurrentPassword.value.trim();
    const newPassword = editNewPassword.value.trim();

    if (!currentPassword) {
      showToast('Digite a senha atual para salvar alterações');
      return;
    }
    if (!newPassword) {
      showToast('Digite uma nova senha');
      return;
    }

    try {
      const res = await fetch(`${AUTH_API}/users/${encodeURIComponent(loggedUsername)}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currentPassword, newPassword })
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.erro || 'Falha ao salvar alterações');
      }
      const data = await res.json();
      loggedUsername = data.username;
      currentUsername.textContent = loggedUsername;
      editUsernameCurrent.value = loggedUsername;
      editCurrentPassword.value = '';
      editNewPassword.value = '';
      showToast('Alterações salvas com sucesso');
    } catch (e) {
      showToast(e.message);
    }
  });

  document.getElementById('btnCreateUser').addEventListener('click', async () => {
    const username = newUserUsername.value.trim();
    const password = newUserPassword.value.trim();
    if (!username || !password) {
      showToast('Digite usuário e senha para criar novo usuário');
      return;
    }

    try {
      const res = await fetch(`${AUTH_API}/users`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.erro || 'Falha ao criar usuário');
      }
      newUserUsername.value = '';
      newUserPassword.value = '';
      showToast('Usuário criado com sucesso');
      loadUsers();
    } catch (e) {
      showToast(e.message);
    }
  });

  document.querySelectorAll('#fStatusGroup .status-opt').forEach(btn => {
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

  document.getElementById('btnExport').addEventListener('click', exportToExcel);
  document.getElementById('btnNew').addEventListener('click', () => openModal(null));
  document.getElementById('btnSave').addEventListener('click', savePrinter);
  document.getElementById('btnClose').addEventListener('click', closeModal);
  document.getElementById('btnCancel').addEventListener('click', closeModal);
  document.getElementById('modalOverlay').addEventListener('click', (e) => {
    if (e.target.id === 'modalOverlay') closeModal();
  });
  document.querySelectorAll('#fConnectionTypeGroup .status-opt').forEach(btn => {
    btn.addEventListener('click', () => {
      setConnectionButtons(btn.dataset.connection);
      updateConnectionFieldsUI();
    });
  });
  document.getElementById('search').addEventListener('input', render);
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
  document.getElementById('navPrinters').addEventListener('click', () => switchView('main'));
  document.getElementById('navReport').addEventListener('click', () => switchView('report'));
  document.getElementById('reportSearch').addEventListener('input', renderReport);

  loadPrinters();
}

window.addEventListener('DOMContentLoaded', init);
