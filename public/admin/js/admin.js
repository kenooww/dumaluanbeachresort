const TOKEN_KEY = 'amihan_token';
const USER_KEY = 'amihan_user';

function getToken() { return localStorage.getItem(TOKEN_KEY); }
function getStoredUser() {
  try { return JSON.parse(localStorage.getItem(USER_KEY) || 'null'); } catch { return null; }
}
function authHeaders() {
  const token = getToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

// This script is shared by login.html and dashboard.html.
// Only run the dashboard logic when the dashboard's elements are present.
const isDashboard = document.getElementById('panel-rooms') !== null;

if (isDashboard) {
  if (!getToken()) {
    window.location.href = '/admin/login.html';
  } else {
    initDashboard();
  }
}

function initDashboard() {
  const user = getStoredUser();
  document.getElementById('whoAmI').textContent = user ? `${user.name} · ${user.role}` : '';

  // ---------- Sidebar panel switching ----------
  const sidebarLinks = document.querySelectorAll('.sidebar-link');
  sidebarLinks.forEach((link) => {
    link.addEventListener('click', () => {
      sidebarLinks.forEach((l) => l.classList.remove('is-active'));
      link.classList.add('is-active');
      document.querySelectorAll('.panel').forEach((p) => p.classList.remove('is-active'));
      document.getElementById(`panel-${link.dataset.panel}`).classList.add('is-active');
    });
  });

  document.getElementById('logoutBtn').addEventListener('click', () => {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    window.location.href = '/admin/login.html';
  });

  // ---------- Modal helpers ----------
  document.querySelectorAll('[data-close]').forEach((btn) => {
    btn.addEventListener('click', () => closeModal(document.getElementById(btn.dataset.close)));
  });
  function openModal(el) { el.classList.add('is-open'); }
  function closeModal(el) { el.classList.remove('is-open'); }

  async function handleAuthedFetch(url, options = {}) {
    const res = await fetch(url, { ...options, headers: { ...(options.headers || {}), ...authHeaders() } });
    if (res.status === 401) {
      localStorage.removeItem(TOKEN_KEY);
      window.location.href = '/admin/login.html';
      throw new Error('Session expired.');
    }
    return res;
  }

  // =====================================================
  // ROOMS
  // =====================================================
  const roomModalOverlay = document.getElementById('roomModalOverlay');
  const roomForm = document.getElementById('roomForm');
  const roomFormError = document.getElementById('roomFormError');
  const roomImageInput = document.getElementById('roomImage');
  const roomImagePreview = document.getElementById('roomImagePreview');

  document.getElementById('newRoomBtn').addEventListener('click', () => {
    roomForm.reset();
    document.getElementById('roomId').value = '';
    document.getElementById('roomModalTitle').textContent = 'Add room';
    roomImagePreview.hidden = true;
    roomFormError.textContent = '';
    openModal(roomModalOverlay);
  });

  roomImageInput.addEventListener('change', () => {
    const file = roomImageInput.files[0];
    if (!file) { roomImagePreview.hidden = true; return; }
    roomImagePreview.src = URL.createObjectURL(file);
    roomImagePreview.hidden = false;
  });

  async function loadRoomsTable() {
    const tbody = document.getElementById('roomsTableBody');
    tbody.innerHTML = '<tr><td colspan="7" class="muted-row">Loading rooms…</td></tr>';
    try {
      const res = await handleAuthedFetch('/api/rooms');
      const rooms = await res.json();
      if (!rooms.length) {
        tbody.innerHTML = '<tr><td colspan="7" class="muted-row">No rooms yet — click "Add room" to create the first listing.</td></tr>';
        return;
      }
      tbody.innerHTML = rooms.map(roomRowHTML).join('');
      rooms.forEach((room) => {
        document.querySelector(`[data-edit-room="${room._id}"]`)?.addEventListener('click', () => openRoomForEdit(room));
        document.querySelector(`[data-delete-room="${room._id}"]`)?.addEventListener('click', () => deleteRoom(room._id, room.name));
      });
    } catch (err) {
      tbody.innerHTML = `<tr><td colspan="7" class="muted-row">Couldn't load rooms: ${err.message}</td></tr>`;
    }
  }

  function roomRowHTML(room) {
    const thumb = room.image
      ? `<img class="thumb" src="${room.image}" alt="">`
      : `<span class="thumb-empty" title="No photo uploaded"></span>`;
    const status = room.available
      ? '<span class="badge badge-available">Available</span>'
      : '<span class="badge badge-unavailable">Unavailable</span>';
    return `
      <tr>
        <td>${thumb}</td>
        <td>${escapeHtml(room.name)}</td>
        <td>${escapeHtml(room.type || '')}</td>
        <td>$${Number(room.pricePerNight).toFixed(0)}</td>
        <td>${room.capacity}</td>
        <td>${status}</td>
        <td>
          <div class="row-actions">
            <button data-edit-room="${room._id}">Edit</button>
            <button class="danger" data-delete-room="${room._id}">Delete</button>
          </div>
        </td>
      </tr>`;
  }

  function openRoomForEdit(room) {
    document.getElementById('roomModalTitle').textContent = 'Edit room';
    document.getElementById('roomId').value = room._id;
    document.getElementById('roomName').value = room.name;
    document.getElementById('roomType').value = room.type;
    document.getElementById('roomDescription').value = room.description;
    document.getElementById('roomPrice').value = room.pricePerNight;
    document.getElementById('roomCapacity').value = room.capacity;
    document.getElementById('roomAmenities').value = (room.amenities || []).join(', ');
    document.getElementById('roomAvailable').checked = !!room.available;
    if (room.image) {
      roomImagePreview.src = room.image;
      roomImagePreview.hidden = false;
    } else {
      roomImagePreview.hidden = true;
    }
    roomFormError.textContent = '';
    openModal(roomModalOverlay);
  }

  async function deleteRoom(id, name) {
    if (!confirm(`Delete "${name}"? This can't be undone.`)) return;
    try {
      const res = await handleAuthedFetch(`/api/rooms/${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message);
      loadRoomsTable();
    } catch (err) {
      alert(`Couldn't delete room: ${err.message}`);
    }
  }

  roomForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    roomFormError.textContent = '';
    const id = document.getElementById('roomId').value;
    const formData = new FormData(roomForm);
    formData.set('available', document.getElementById('roomAvailable').checked ? 'true' : 'false');
    if (!roomImageInput.files[0]) formData.delete('image');

    try {
      const res = await handleAuthedFetch(id ? `/api/rooms/${id}` : '/api/rooms', {
        method: id ? 'PUT' : 'POST',
        body: formData,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Could not save room.');
      closeModal(roomModalOverlay);
      loadRoomsTable();
    } catch (err) {
      roomFormError.textContent = err.message;
    }
  });

  // =====================================================
  // USERS
  // =====================================================
  const userModalOverlay = document.getElementById('userModalOverlay');
  const userForm = document.getElementById('userForm');
  const userFormError = document.getElementById('userFormError');

  document.getElementById('newUserBtn').addEventListener('click', () => {
    userForm.reset();
    userFormError.textContent = '';
    openModal(userModalOverlay);
  });

  async function loadUsersTable() {
    const tbody = document.getElementById('usersTableBody');
    tbody.innerHTML = '<tr><td colspan="5" class="muted-row">Loading users…</td></tr>';
    try {
      const res = await handleAuthedFetch('/api/users');
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Could not load users.');
      if (!data.length) {
        tbody.innerHTML = '<tr><td colspan="5" class="muted-row">No users yet.</td></tr>';
        return;
      }
      tbody.innerHTML = data.map(userRowHTML).join('');
      data.forEach((u) => {
        document.querySelector(`[data-delete-user="${u._id}"]`)?.addEventListener('click', () => deleteUser(u._id, u.name));
      });
    } catch (err) {
      tbody.innerHTML = `<tr><td colspan="5" class="muted-row">Couldn't load users: ${err.message}</td></tr>`;
    }
  }

  function userRowHTML(u) {
    const roleBadge = u.role === 'admin' ? '<span class="badge badge-admin">Admin</span>' : '<span class="badge badge-staff">Staff</span>';
    const statusBadge = u.active ? '<span class="badge badge-available">Active</span>' : '<span class="badge badge-unavailable">Disabled</span>';
    return `
      <tr>
        <td>${escapeHtml(u.name)}</td>
        <td>${escapeHtml(u.email)}</td>
        <td>${roleBadge}</td>
        <td>${statusBadge}</td>
        <td><div class="row-actions"><button class="danger" data-delete-user="${u._id}">Delete</button></div></td>
      </tr>`;
  }

  async function deleteUser(id, name) {
    if (!confirm(`Delete user "${name}"?`)) return;
    try {
      const res = await handleAuthedFetch(`/api/users/${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message);
      loadUsersTable();
    } catch (err) {
      alert(`Couldn't delete user: ${err.message}`);
    }
  }

  userForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    userFormError.textContent = '';
    const payload = {
      name: document.getElementById('userName').value,
      email: document.getElementById('userEmail').value,
      password: document.getElementById('userPassword').value,
      role: document.getElementById('userRole').value,
    };
    try {
      const res = await handleAuthedFetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Could not save user.');
      closeModal(userModalOverlay);
      loadUsersTable();
    } catch (err) {
      userFormError.textContent = err.message;
    }
  });

  function escapeHtml(str = '') {
    return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  loadRoomsTable();
  loadUsersTable();
}
