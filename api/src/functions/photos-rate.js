const { app } = require('@azure/functions');
const { v4: uuidv4 } = require('uuid');
const { containers } = require('../shared/cosmos');
const { requireAuth } = require('../shared/auth');

app.http('photos-rate', {
  methods: ['POST'],
  authLevel: 'anonymous',
  route: 'photos/{id}/rate',
  handler: async (request, context) => {
    const auth = requireAuth(request);
    if (auth.error) return auth.error;

    const photoId = request.params.id;
    const body = await request.json().catch(() => ({}));
    const score = parseInt(body.score, 10);

    if (isNaN(score) || score < 1 || score > 5) {
      return { status: 400, jsonBody: { error: 'Score must be 1-5' } };
    }

    // One rating per (user, photo) - upsert pattern
    const ratingId = `${photoId}_${auth.user.id}`;
    const rating = {
      id: ratingId,
      photoId,
      userId: auth.user.id,
      score,
      ratedAt: new Date().toISOString(),
    };

    const { resource } = await containers.ratings.items.upsert(rating);
    return { status: 200, jsonBody: resource };
  },
});