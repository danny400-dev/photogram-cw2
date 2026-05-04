const { app } = require('@azure/functions');
const { containers } = require('../shared/cosmos');

app.http('photos-list', {
  methods: ['GET'],
  authLevel: 'anonymous',
  route: 'photos',
  handler: async (request, context) => {
    const url = new URL(request.url);
    const search = (url.searchParams.get('search') || '').trim().toLowerCase();
    const creatorId = url.searchParams.get('creatorId');
    const limit = Math.min(parseInt(url.searchParams.get('limit') || '50', 10), 100);

    let querySpec;
    if (creatorId) {
      // Filter to a specific creator (used by /creator.html "My uploads")
      querySpec = {
        query: 'SELECT * FROM c WHERE c.creatorId = @creatorId ORDER BY c.uploadedAt DESC OFFSET 0 LIMIT @limit',
        parameters: [
          { name: '@creatorId', value: creatorId },
          { name: '@limit', value: limit },
        ],
      };
    } else if (search) {
      // Search across title, caption, location, AI tags
      querySpec = {
        query: `SELECT * FROM c
                WHERE CONTAINS(LOWER(c.title), @s)
                   OR CONTAINS(LOWER(c.caption), @s)
                   OR CONTAINS(LOWER(c.location), @s)
                   OR EXISTS(SELECT VALUE t FROM t IN c.aiTags WHERE CONTAINS(LOWER(t), @s))
                ORDER BY c.uploadedAt DESC OFFSET 0 LIMIT @limit`,
        parameters: [
          { name: '@s', value: search },
          { name: '@limit', value: limit },
        ],
      };
    } else {
      // Default feed — most recent photos across everyone
      querySpec = {
        query: 'SELECT * FROM c ORDER BY c.uploadedAt DESC OFFSET 0 LIMIT @limit',
        parameters: [{ name: '@limit', value: limit }],
      };
    }

    const { resources } = await containers.photos.items.query(querySpec).fetchAll();
    return { status: 200, jsonBody: { photos: resources, count: resources.length } };
  },
});