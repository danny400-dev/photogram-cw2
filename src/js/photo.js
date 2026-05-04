// Photo detail page: show photo, comments, ratings.

let currentPhotoId = null;

document.addEventListener('DOMContentLoaded', () => {
  const params = new URLSearchParams(window.location.search);
  currentPhotoId = params.get('id');
  if (!currentPhotoId) {
    document.getElementById('photo-detail').innerHTML = '<p class="loading">No photo specified.</p>';
    return;
  }
  loadPhoto();

  // Wire up comment form
  const form = document.getElementById('comment-form');
  if (form) {
    form.onsubmit = async (e) => {
      e.preventDefault();
      if (!window.PhotogramAuth.getCurrentUser()) {
        window.PhotogramAuth.showSignInDialog();
        return;
      }
      const text = document.getElementById('comment-input').value.trim();
      if (!text) return;
      try {
        await window.PhotogramAPI.addComment(currentPhotoId, text);
        document.getElementById('comment-input').value = '';
        loadPhoto();
      } catch (err) {
        alert(`Failed to add comment: ${err.message}`);
      }
    };
  }

  // Wire up star rating
  const stars = document.querySelectorAll('#rating-stars span');
  stars.forEach(star => {
    star.onmouseenter = () => highlightStars(parseInt(star.dataset.value, 10));
    star.onclick = async () => {
      if (!window.PhotogramAuth.getCurrentUser()) {
        window.PhotogramAuth.showSignInDialog();
        return;
      }
      const score = parseInt(star.dataset.value, 10);
      try {
        await window.PhotogramAPI.ratePhoto(currentPhotoId, score);
        loadPhoto();
      } catch (err) {
        alert(`Failed to rate: ${err.message}`);
      }
    };
  });
  document.getElementById('rating-stars').onmouseleave = () => highlightStars(0);
});

function highlightStars(value) {
  document.querySelectorAll('#rating-stars span').forEach(s => {
    const v = parseInt(s.dataset.value, 10);
    s.textContent = v <= value ? '★' : '☆';
    s.classList.toggle('filled', v <= value);
  });
}

async function loadPhoto() {
  try {
    const data = await window.PhotogramAPI.getPhoto(currentPhotoId);
    renderPhoto(data.photo);
    renderComments(data.comments);
    renderRating(data.rating);
  } catch (err) {
    document.getElementById('photo-detail').innerHTML = `<p class="loading" style="color:#c00;">Failed to load: ${escapeHtml(err.message)}</p>`;
  }
}

function renderPhoto(photo) {
  const container = document.getElementById('photo-detail');
  const tagsHtml = (photo.aiTags || []).map(t => `<span class="tag">${escapeHtml(t)}</span>`).join('');
  const peopleHtml = (photo.peopleTagged || []).map(p => `<span class="tag" style="background:#e3f2fd;">${escapeHtml(p)}</span>`).join('');
  container.innerHTML = `
    <img src="${photo.blobUrl}" alt="${escapeHtml(photo.title)}">
    <div class="meta">
      <h2>${escapeHtml(photo.title)}</h2>
      <p style="color:#666;margin:0.5rem 0;">by <strong>${escapeHtml(photo.creatorName || photo.creatorId)}</strong>${photo.location ? ' · ' + escapeHtml(photo.location) : ''}</p>
      ${photo.caption ? `<p style="margin:1rem 0;">${escapeHtml(photo.caption)}</p>` : ''}
      ${photo.aiDescription ? `<p style="color:#666;font-style:italic;margin:0.5rem 0;">AI description: "${escapeHtml(photo.aiDescription)}"</p>` : ''}
      <div style="margin-top:1rem;">
        <strong style="font-size:0.85rem;color:#666;">AI Tags</strong>
        <div class="tags" style="margin-top:0.25rem;">${tagsHtml || '<span style="color:#999;">none</span>'}</div>
      </div>
      ${peopleHtml ? `<div style="margin-top:1rem;"><strong style="font-size:0.85rem;color:#666;">People</strong><div class="tags" style="margin-top:0.25rem;">${peopleHtml}</div></div>` : ''}
    </div>`;
}

function renderComments(comments) {
  const container = document.getElementById('comments-list');
  if (!comments || comments.length === 0) {
    container.innerHTML = '<p class="loading">No comments yet. Be the first!</p>';
    return;
  }
  container.innerHTML = '';
  comments.forEach(c => {
    const div = document.createElement('div');
    div.className = 'comment';
    div.innerHTML = `
      <div>
        <span class="author">${escapeHtml(c.userName || c.userId)}</span>
        <span class="sentiment ${c.sentiment}">${c.sentiment}</span>
      </div>
      <p style="margin-top:0.25rem;">${escapeHtml(c.text)}</p>
      <p style="font-size:0.75rem;color:#999;margin-top:0.25rem;">${formatDate(c.createdAt)}</p>`;
    container.appendChild(div);
  });
}

function renderRating(rating) {
  const summary = document.getElementById('rating-summary');
  if (!summary) return;
  if (rating.count === 0) {
    summary.textContent = 'No ratings yet — be the first!';
  } else {
    summary.textContent = `Average: ${rating.average} ★ (${rating.count} ratings)`;
  }
}

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, c => ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[c]));
}

function formatDate(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  return d.toLocaleString();
}