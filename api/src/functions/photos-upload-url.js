const { app } = require('@azure/functions');
const { v4: uuidv4 } = require('uuid');
const { generateUploadSasUrl, publicBlobUrl } = require('../shared/blob');
const { requireCreator } = require('../shared/auth');

app.http('photos-upload-url', {
  methods: ['POST'],
  authLevel: 'anonymous',
  route: 'photos/upload-url',
  handler: async (request, context) => {
    const auth = requireCreator(request);
    if (auth.error) return auth.error;

    const body = await request.json().catch(() => ({}));
    const { fileName, contentType } = body;

    if (!fileName) {
      return { status: 400, jsonBody: { error: 'fileName is required' } };
    }

    // Generate a unique blob name to avoid collisions
    const ext = (fileName.split('.').pop() || 'jpg').toLowerCase();
    const safeExt = ['jpg','jpeg','png','gif','webp'].includes(ext) ? ext : 'jpg';
    const blobName = `${auth.user.id}/${uuidv4()}.${safeExt}`;

    const uploadUrl = generateUploadSasUrl(blobName, 15);
    const publicUrl = publicBlobUrl(blobName);

    return {
      status: 200,
      jsonBody: { uploadUrl, blobName, publicUrl, contentType: contentType || 'application/octet-stream' },
    };
  },
}); 