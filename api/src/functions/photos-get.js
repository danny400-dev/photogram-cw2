const { app } = require('@azure/functions');
const { containers } = require('../shared/cosmos');

app.http('photos-get', {
  methods: ['GET'],
  authLevel: 'anonymous',
  route: 'photos/{id}',
  handler: async (request, context) => {
    const id = request.params.id;
    if (!id) return { status: 400, jsonBody: { error: 'id required' } };

    // Photo - we have to query because we don't know the creatorId (partition key)
    const { resources: photoResults } = await containers.photos.items
      .query({ query: 'SELECT * FROM c WHERE c.id = @id', parameters: [{ name: '@id', value: id }] })
      .fetchAll();

    if (photoResults.length === 0) {
      return { status: 404, jsonBody: { error: 'Photo not found' } };
    }
    const photo = photoResults[0];

    // Comments (partitioned by photoId — fast lookup)
    const { resources: comments } = await containers.comments.items
      .query({ query: 'SELECT * FROM c WHERE c.photoId = @id ORDER BY c.createdAt DESC', parameters: [{ name: '@id', value: id }] })
      .fetchAll();

    // Ratings — return aggregate
    const { resources: ratings } = await containers.ratings.items
      .query({ query: 'SELECT * FROM c WHERE c.photoId = @id', parameters: [{ name: '@id', value: id }] })
      .fetchAll();

    const ratingSum = ratings.reduce((s, r) => s + (r.score || 0), 0);
    const ratingCount = ratings.length;
    const ratingAvg = ratingCount > 0 ? (ratingSum / ratingCount).toFixed(1) : null;

    return {
      status: 200,
      jsonBody: { photo, comments, rating: { average: ratingAvg, count: ratingCount } },
    };
  },
});