// Simple local auth for Step 8. Step 9 replaces this with Microsoft Entra.

const STORAGE_KEY = 'photogram_user';

function getCurrentUser() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function setCurrentUser(user) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(user));
}

function signOut() {
  localStorage.removeItem(STORAGE_KEY);
  window.location.href = '/index.html';
}

function renderAuthBar() {
  const user = getCurrentUser();
  const userInfo = document.getElementById('user-info');
  const authLink = document.getElementById('auth-link');

  if (user) {
    if (userInfo) userInfo.textContent = `${user.name} (${user.role})`;
    if (authLink) {
      authLink.textContent = 'Sign out';
      authLink.href = '#';
      authLink.onclick = (e) => { e.preventDefault(); signOut(); };
    }
  } else {
    if (userInfo) userInfo.textContent = '';
    if (authLink) {
      authLink.textContent = 'Sign in';
      authLink.href = '#';
      authLink.onclick = (e) => { e.preventDefault(); showSignInDialog(); };
    }
  }
}

function showSignInDialog() {
  // Build modal once
  let modal = document.getElementById('signin-modal');
  if (!modal) {
    modal = document.createElement('div');
    modal.id = 'signin-modal';
    modal.innerHTML = `
      <div class="signin-overlay"></div>
      <div class="signin-card">
        <h3>Sign in to Photogram</h3>
        <p class="muted">Choose your role for this session.</p>
        <label>Display name
          <input type="text" id="signin-name" placeholder="e.g. alex" required>
        </label>
        <label>Role
          <select id="signin-role">
            <option value="consumer">Consumer (browse, comment, rate)</option>
            <option value="creator">Creator (upload + everything else)</option>
          </select>
        </label>
        <div class="signin-actions">
          <button id="signin-cancel" type="button" class="ghost">Cancel</button>
          <button id="signin-confirm" type="button">Sign in</button>
        </div>
      </div>`;
    document.body.appendChild(modal);

    // Inject styles for the modal
    const style = document.createElement('style');
    style.textContent = `
      #signin-modal { position: fixed; inset: 0; z-index: 100; display: flex; align-items: center; justify-content: center; }
      .signin-overlay { position: absolute; inset: 0; background: rgba(0,0,0,0.5); }
      .signin-card { position: relative; background: white; padding: 2rem; border-radius: 12px; min-width: 360px; box-shadow: 0 10px 40px rgba(0,0,0,0.2); }
      .signin-card h3 { margin-bottom: 0.5rem; }
      .signin-card .muted { color: #666; margin-bottom: 1rem; font-size: 0.9rem; }
      .signin-card label { display: flex; flex-direction: column; gap: 0.25rem; margin-bottom: 1rem; font-weight: 500; }
      .signin-card input, .signin-card select { padding: 0.6rem; border: 1px solid #dbdbdb; border-radius: 6px; font-size: 1rem; }
      .signin-actions { display: flex; gap: 0.5rem; justify-content: flex-end; }
      .signin-actions .ghost { background: white; color: #262626; border: 1px solid #dbdbdb; }
      .signin-actions .ghost:hover { background: #f5f5f5; }
    `;
    document.head.appendChild(style);

    modal.querySelector('#signin-cancel').onclick = () => { modal.style.display = 'none'; };
    modal.querySelector('.signin-overlay').onclick = () => { modal.style.display = 'none'; };
    modal.querySelector('#signin-confirm').onclick = () => {
      const name = modal.querySelector('#signin-name').value.trim();
      const role = modal.querySelector('#signin-role').value;
      if (!name) { alert('Please enter a display name'); return; }
      // Sanitize — IDs cannot contain spaces or special chars
      const id = name.toLowerCase().replace(/[^a-z0-9]/g, '_');
      setCurrentUser({ id, name, role });
      modal.style.display = 'none';
      window.location.reload();
    };
  }
  modal.style.display = 'flex';
}

function requireRole(role) {
  const user = getCurrentUser();
  if (!user) { showSignInDialog(); return false; }
  if (role === 'creator' && user.role !== 'creator') {
    alert('This action requires a Creator account. Sign out and sign in again as Creator.');
    return false;
  }
  return true;
}

window.PhotogramAuth = { getCurrentUser, setCurrentUser, signOut, renderAuthBar, showSignInDialog, requireRole };

document.addEventListener('DOMContentLoaded', renderAuthBar);