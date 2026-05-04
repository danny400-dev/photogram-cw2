// Consumer feed: list photos, search, click to view detail.

async function loadFeed(searchTerm = '') {
  const feed = document.getElementById('feed');
  if (!feed) return;
  feed.innerHTML = '<p class="loading">Loading photos…</p>';

  try {
    const data = await window.PhotogramAPI.listPhotos(searchTerm);
    if (!data.photos || data.photos.length === 0) {
      feed.innerHTML = '<p class="loading">No photos yet. Sign in as a Creator to upload the first one!</p>';
      return;
    }
    feed.innerHTML = '';
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
          <p class="muted" style="font-size:0.85rem;color:#777;">by ${escapeHtml(photo.creatorName || photo.creatorId)} · ${photo.location ? escapeHtml(photo.location) + ' · ' : ''}${formatDate(photo.uploadedAt)}</p>
          <div class="tags">${tagsHtml}</div>
        </div>`;
      feed.appendChild(card);
    });
  } catch (err) {
    console.error(err);
    feed.innerHTML = `<p class="loading" style="color:#c00;">Failed to load feed: ${escapeHtml(err.message)}</p>`;
  }
}

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, c => ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[c]));
}

function formatDate(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  const now = new Date();
  const diff = (now - d) / 1000; // seconds
  if (diff < 60) return 'just now';
  if (diff < 3600) return `${Math.floor(diff/60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff/3600)}h ago`;
  if (diff < 86400*7) return `${Math.floor(diff/86400)}d ago`;
  return d.toLocaleDateString();
}

document.addEventListener('DOMContentLoaded', () => {
  loadFeed();

  const searchBtn = document.getElementById('search-btn');
  const searchInput = document.getElementById('search-input');
  if (searchBtn && searchInput) {
    searchBtn.onclick = () => loadFeed(searchInput.value.trim());
    searchInput.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') loadFeed(searchInput.value.trim());
    });
  }
});