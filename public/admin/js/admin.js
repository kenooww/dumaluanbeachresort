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
  const roomImagesInput = document.getElementById('roomImages');
  const roomImagesPreview = document.getElementById('roomImagesPreview');

  function renderRoomImagePreview(files = [], existingImages = []) {
    const previews = [];
    existingImages.filter(Boolean).forEach((src) => previews.push({ src, isExisting: true }));
    Array.from(files || []).forEach((file) => previews.push({ src: URL.createObjectURL(file), isExisting: false }));

    if (!previews.length) {
      roomImagesPreview.innerHTML = '';
      return;
    }

    roomImagesPreview.innerHTML = previews.map((item) => `
      <div style="width:90px;height:90px;border-radius:10px;overflow:hidden;border:1px solid #e3e3e3;display:flex;align-items:center;justify-content:center;background:#f8f8f8;">
        <img src="${item.src}" alt="Room preview" style="width:100%;height:100%;object-fit:cover;">
      </div>
    `).join('');
  }

  document.getElementById('newRoomBtn').addEventListener('click', () => {
    roomForm.reset();
    document.getElementById('roomId').value = '';
    document.getElementById('roomModalTitle').textContent = 'Add room';
    renderRoomImagePreview([]);
    roomFormError.textContent = '';
    openModal(roomModalOverlay);
  });

  roomImagesInput.addEventListener('change', () => {
    renderRoomImagePreview(roomImagesInput.files || []);
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
    if (room.images?.length || room.image) {
      renderRoomImagePreview([], room.images?.length ? room.images : [room.image]);
    } else {
      renderRoomImagePreview([]);
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
    if (!roomImagesInput.files.length) {
      formData.delete('images');
    }

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
  // BLOG POSTS
  // =====================================================
  const postModalOverlay = document.getElementById('postModalOverlay');
  const postForm = document.getElementById('postForm');
  const postFormError = document.getElementById('postFormError');
  const postImageInput = document.getElementById('postImage');
  const postImagePreview = document.getElementById('postImagePreview');

  document.getElementById('newPostBtn').addEventListener('click', () => {
    postForm.reset();
    document.getElementById('postId').value = '';
    document.getElementById('postModalTitle').textContent = 'Add post';
    document.getElementById('postPublished').checked = true;
    postImagePreview.hidden = true;
    postFormError.textContent = '';
    openModal(postModalOverlay);
  });

  postImageInput.addEventListener('change', () => {
    const file = postImageInput.files[0];
    if (!file) { postImagePreview.hidden = true; return; }
    postImagePreview.src = URL.createObjectURL(file);
    postImagePreview.hidden = false;
  });

  async function loadPostsTable() {
    const tbody = document.getElementById('postsTableBody');
    tbody.innerHTML = '<tr><td colspan="6" class="muted-row">Loading posts...</td></tr>';
    try {
      const res = await handleAuthedFetch('/api/blog-posts/admin/all');
      const posts = await res.json();
      if (!res.ok) throw new Error(posts.message || 'Could not load posts.');
      if (!posts.length) {
        tbody.innerHTML = '<tr><td colspan="6" class="muted-row">No blog posts yet - click "Add post" to publish the first story.</td></tr>';
        return;
      }
      tbody.innerHTML = posts.map(postRowHTML).join('');
      posts.forEach((post) => {
        document.querySelector(`[data-edit-post="${post._id}"]`)?.addEventListener('click', () => openPostForEdit(post));
        document.querySelector(`[data-delete-post="${post._id}"]`)?.addEventListener('click', () => deletePost(post._id, post.title));
      });
    } catch (err) {
      tbody.innerHTML = `<tr><td colspan="6" class="muted-row">Couldn't load posts: ${err.message}</td></tr>`;
    }
  }

  function postRowHTML(post) {
    const thumb = post.image
      ? `<img class="thumb" src="${post.image}" alt="">`
      : `<span class="thumb-empty" title="No photo uploaded"></span>`;
    const status = post.published
      ? '<span class="badge badge-available">Published</span>'
      : '<span class="badge badge-unavailable">Draft</span>';
    return `
      <tr>
        <td>${thumb}</td>
        <td>
          <strong>${escapeHtml(post.title)}</strong>
          <span class="subtext">${formatDate(post.createdAt)}</span>
        </td>
        <td>${escapeHtml(post.category || '')}</td>
        <td>${escapeHtml(post.author || '')}</td>
        <td>${status}</td>
        <td>
          <div class="row-actions">
            <button data-edit-post="${post._id}">Edit</button>
            <button class="danger" data-delete-post="${post._id}">Delete</button>
          </div>
        </td>
      </tr>`;
  }

  function openPostForEdit(post) {
    document.getElementById('postModalTitle').textContent = 'Edit post';
    document.getElementById('postId').value = post._id;
    document.getElementById('postTitle').value = post.title;
    document.getElementById('postCategory').value = post.category || '';
    document.getElementById('postAuthor').value = post.author || '';
    document.getElementById('postExcerpt').value = post.excerpt || '';
    document.getElementById('postContent').value = post.content || '';
    document.getElementById('postPublished').checked = !!post.published;
    if (post.image) {
      postImagePreview.src = post.image;
      postImagePreview.hidden = false;
    } else {
      postImagePreview.hidden = true;
    }
    postImageInput.value = '';
    postFormError.textContent = '';
    openModal(postModalOverlay);
  }

  async function deletePost(id, title) {
    if (!confirm(`Delete blog post "${title}"? This can't be undone.`)) return;
    try {
      const res = await handleAuthedFetch(`/api/blog-posts/${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Could not delete post.');
      loadPostsTable();
    } catch (err) {
      alert(`Couldn't delete post: ${err.message}`);
    }
  }

  postForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    postFormError.textContent = '';
    const id = document.getElementById('postId').value;
    const formData = new FormData(postForm);
    formData.set('published', document.getElementById('postPublished').checked ? 'true' : 'false');
    if (!postImageInput.files[0]) formData.delete('image');

    try {
      const res = await handleAuthedFetch(id ? `/api/blog-posts/${id}` : '/api/blog-posts', {
        method: id ? 'PUT' : 'POST',
        body: formData,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Could not save post.');
      closeModal(postModalOverlay);
      loadPostsTable();
    } catch (err) {
      postFormError.textContent = err.message;
    }
  });

  // =====================================================
  // INQUIRIES
  // =====================================================
  async function loadInquiriesTable() {
    const tbody = document.getElementById('inquiriesTableBody');
    tbody.innerHTML = '<tr><td colspan="6" class="muted-row">Loading inquiries...</td></tr>';
    try {
      const res = await handleAuthedFetch('/api/contact');
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Could not load inquiries.');
      if (!data.length) {
        tbody.innerHTML = '<tr><td colspan="6" class="muted-row">No inquiries yet.</td></tr>';
        return;
      }
      tbody.innerHTML = data.map(inquiryRowHTML).join('');
      data.forEach((message) => {
        document.querySelector(`[data-toggle-inquiry="${message._id}"]`)?.addEventListener('click', () => {
          updateInquiryStatus(message._id, !message.read);
        });
        document.querySelector(`[data-delete-inquiry="${message._id}"]`)?.addEventListener('click', () => {
          deleteInquiry(message._id, message.name);
        });
      });
    } catch (err) {
      tbody.innerHTML = `<tr><td colspan="6" class="muted-row">Couldn't load inquiries: ${err.message}</td></tr>`;
    }
  }

  function inquiryRowHTML(message) {
    const status = message.read
      ? '<span class="badge badge-available">Read</span>'
      : '<span class="badge badge-unavailable">New</span>';
    const toggleLabel = message.read ? 'Mark new' : 'Mark read';
    return `
      <tr>
        <td>
          <strong>${escapeHtml(message.name)}</strong>
          <span class="subtext">${escapeHtml(message.email)}</span>
        </td>
        <td>${escapeHtml(message.subject || 'No subject')}</td>
        <td class="inquiry-message">${escapeHtml(message.message)}</td>
        <td>${formatDate(message.createdAt)}</td>
        <td>${status}</td>
        <td>
          <div class="row-actions">
            <button data-toggle-inquiry="${message._id}">${toggleLabel}</button>
            <button class="danger" data-delete-inquiry="${message._id}">Delete</button>
          </div>
        </td>
      </tr>`;
  }

  async function updateInquiryStatus(id, read) {
    try {
      const res = await handleAuthedFetch(`/api/contact/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ read }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Could not update inquiry.');
      loadInquiriesTable();
    } catch (err) {
      alert(`Couldn't update inquiry: ${err.message}`);
    }
  }

  async function deleteInquiry(id, name) {
    if (!confirm(`Delete inquiry from "${name}"?`)) return;
    try {
      const res = await handleAuthedFetch(`/api/contact/${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Could not delete inquiry.');
      loadInquiriesTable();
    } catch (err) {
      alert(`Couldn't delete inquiry: ${err.message}`);
    }
  }

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

  function formatDate(value) {
    if (!value) return '';
    return new Intl.DateTimeFormat(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(new Date(value));
  }

  loadRoomsTable();
  loadPostsTable();
  loadInquiriesTable();
  loadUsersTable();
}