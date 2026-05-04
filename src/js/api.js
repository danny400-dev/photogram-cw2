// API client for Photogram. All backend calls go through these helpers.

const API_BASE = window.PHOTOGRAM_CONFIG.API_BASE;

function getAuthHeaders() {
  const user = window.PhotogramAuth?.getCurrentUser();
  if (!user) return {};
  // Dev-mode auth (Step 8). Step 9 replaces this with real Microsoft Entra JWTs.
  return {
    'x-dev-user': user.id,
    'x-dev-role': user.role,
  };
}

async function apiFetch(path, options = {}) {
  const url = `${API_BASE}${path}`;
  const headers = {
    ...(options.headers || {}),
    ...getAuthHeaders(),
  };
  if (options.body && !(options.body instanceof FormData)) {
    headers['Content-Type'] = 'application/json';
  }

  const response = await fetch(url, { ...options, headers });

  if (!response.ok) {
    const errBody = await response.text().catch(() => '');
    throw new Error(`API ${response.status}: ${errBody || response.statusText}`);
  }

  const ct = response.headers.get('content-type') || '';
  if (ct.includes('application/json')) return response.json();
  return response.text();
}

window.PhotogramAPI = {
  // Auth
  whoAmI: () => apiFetch('/me'),

  // Photos
  listPhotos: (search) => {
    const q = search ? `?search=${encodeURIComponent(search)}` : '';
    return apiFetch(`/photos${q}`);
  },
  myUploads: (creatorId) => apiFetch(`/photos?creatorId=${encodeURIComponent(creatorId)}`),
  getPhoto: (id) => apiFetch(`/photos/${id}`),
  createPhoto: (metadata) => apiFetch('/photos', { method: 'POST', body: JSON.stringify(metadata) }),
  getUploadUrl: (fileName, contentType) =>
    apiFetch('/photos/upload-url', {
      method: 'POST',
      body: JSON.stringify({ fileName, contentType }),
    }),

  // Comments + Ratings
  addComment: (photoId, text) =>
    apiFetch(`/photos/${photoId}/comments`, { method: 'POST', body: JSON.stringify({ text }) }),
  ratePhoto: (photoId, score) =>
    apiFetch(`/photos/${photoId}/rate`, { method: 'POST', body: JSON.stringify({ score }) }),

  // Direct blob upload via SAS
  uploadToBlob: async (sasUrl, file) => {
    const res = await fetch(sasUrl, {
      method: 'PUT',
      headers: {
        'x-ms-blob-type': 'BlockBlob',
        'Content-Type': file.type,
      },
      body: file,
    });
    if (!res.ok) {
      const text = await res.text().catch(() => '');
      throw new Error(`Blob upload failed: ${res.status} ${text}`);
    }
  },
};