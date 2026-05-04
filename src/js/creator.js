// Creator page: upload photo + show "my uploads" list.

function init() {
  console.log('[creator] init called');

  if (!window.PhotogramAuth || !window.PhotogramAPI) {
    console.error('[creator] PhotogramAuth or PhotogramAPI not loaded yet');
    setTimeout(init, 100); // retry in 100ms
    return;
  }

  const user = window.PhotogramAuth.getCurrentUser();
  console.log('[creator] current user:', user);

  if (!user) {
    window.PhotogramAuth.showSignInDialog();
    return;
  }
  if (user.role !== 'creator') {
    document.querySelector('main').innerHTML = `
      <div style="background:white;padding:2rem;border-radius:8px;border:1px solid #dbdbdb;text-align:center;">
        <h2>Creator access required</h2>
        <p style="color:#666;margin:1rem 0;">You're signed in as a <strong>${user.role}</strong>. Sign out and sign in again as a Creator to upload photos.</p>
        <button onclick="window.PhotogramAuth.signOut()">Sign out</button>
      </div>`;
    return;
  }

  const form = document.getElementById('upload-form');
  const uploadBtn = document.getElementById('upload-btn');
  const status = document.getElementById('upload-status');

  if (!form) {
    console.error('[creator] upload-form element not found in DOM');
    return;
  }

  console.log('[creator] wiring up form handler');

  form.onsubmit = async (e) => {
    e.preventDefault();
    console.log('[creator] upload submitted');
    const file = document.getElementById('file-input').files[0];
    const title = document.getElementById('title-input').value.trim();
    const caption = document.getElementById('caption-input').value.trim();
    const location = document.getElementById('location-input').value.trim();
    const peopleRaw = document.getElementById('people-input').value.trim();
    const peopleTagged = peopleRaw ? peopleRaw.split(',').map(s => s.trim()).filter(Boolean) : [];

    if (!file || !title) { showStatus('Photo and title are required', 'error'); return; }
    if (!file.type.startsWith('image/')) { showStatus('Please select an image file', 'error'); return; }
    if (file.size > 10 * 1024 * 1024) { showStatus('Image too large (max 10 MB)', 'error'); return; }

    uploadBtn.disabled = true;
    showStatus('Step 1/3: Requesting upload URL…', 'progress');

    try {
      console.log('[creator] step 1: requesting SAS URL');
      const { uploadUrl, blobName } = await window.PhotogramAPI.getUploadUrl(file.name, file.type);
      console.log('[creator] step 1 done, blob:', blobName);

      showStatus('Step 2/3: Uploading photo to blob storage…', 'progress');
      console.log('[creator] step 2: uploading to blob');
      await window.PhotogramAPI.uploadToBlob(uploadUrl, file);
      console.log('[creator] step 2 done');

      showStatus('Step 3/3: Saving metadata + analyzing with Azure AI Vision…', 'progress');
      console.log('[creator] step 3: saving metadata');
      const photo = await window.PhotogramAPI.createPhoto({
        blobName, title, caption, location, peopleTagged,
      });
      console.log('[creator] step 3 done, photo:', photo);

      const tagsText = (photo.aiTags || []).join(', ') || 'none';
      showStatus(`✓ Uploaded! AI Vision tagged it with: ${tagsText}`, 'success');
      form.reset();
      loadMyUploads();
    } catch (err) {
      console.error('[creator] upload failed:', err);
      showStatus(`Upload failed: ${err.message}`, 'error');
    } finally {
      uploadBtn.disabled = false;
    }
  };

  function showStatus(msg, kind) {
    status.textContent = msg;
    status.className = kind || '';
  }

  loadMyUploads();
}

async function loadMyUploads() {
  const container = document.getElementById('my-uploads');
  if (!container) return;
  if (!window.PhotogramAuth || !window.PhotogramAPI) return;
  const user = window.PhotogramAuth.getCurrentUser();
  if (!user) return;
  container.innerHTML = '<p class="loading">Loading…</p>';
  try {
    const data = await window.PhotogramAPI.myUploads(user.id);
    if (!data.photos || data.photos.length === 0) {
      container.innerHTML = '<p class="loading">No uploads yet. Use the form above to upload your first photo.</p>';
      return;
    }
    container.innerHTML = '';
    data.photos.forEach(photo => {
      const card = document.createElement('div');
      card.className = 'photo-card';
      card.onclick = () => { window.location.href = `/photo.html?id=${photo.id}`; };
      const tagsHtml = (photo.aiTags || []).slice(0, 5)
        .map(t => `<span class="tag">${escapeHtml(t)}</span>`).join('');
      card.innerHTML = `
        <img src="${photo.blobUrl}" alt="${escapeHtml(photo.title)}" loading="lazy">
        <div class="meta">
          <h3>${escapeHtml(photo.title)}</h3>
          <div class="tags">${tagsHtml}</div>
        </div>`;
      container.appendChild(card);
    });
  } catch (err) {
    console.error('[creator] loadMyUploads failed:', err);
    container.innerHTML = `<p class="loading" style="color:#c00;">Failed: ${escapeHtml(err.message)}</p>`;
  }
}

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, c => ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[c]));
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}