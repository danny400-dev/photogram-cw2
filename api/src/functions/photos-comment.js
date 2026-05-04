const { app } = require('@azure/functions');
const { v4: uuidv4 } = require('uuid');
const { containers } = require('../shared/cosmos');
const { requireAuth } = require('../shared/auth');

// Simple rule-based sentiment - good enough for a student project demo.
// In production this would call Azure AI Language. We use a local heuristic for
// reliability and zero-cost: still demonstrates the architectural pattern.
function detectSentiment(text) {
  const t = text.toLowerCase();
  const positive = ['love', 'amazing', 'beautiful', 'great', 'awesome', 'wonderful', 'fantastic', 'excellent', 'good', 'nice', 'gorgeous', 'perfect', 'incredible', 'stunning', '❤', '😍', '🔥', 'cool', 'best', 'lovely'];
  const negative = ['hate', 'awful', 'terrible', 'bad', 'worst', 'disgusting', 'horrible', 'ugly', 'boring', 'poor', 'disappointing', 'fake'];
  let score = 0;
  positive.forEach(w => { if (t.includes(w)) score++; });
  negative.forEach(w => { if (t.includes(w)) score--; });
  if (score > 0) return 'positive';
  if (score < 0) return 'negative';
  return 'neutral';
}

app.http('photos-comment', {
  methods: ['POST'],
  authLevel: 'anonymous',
  route: 'photos/{id}/comments',
  handler: async (request, context) => {
    const auth = requireAuth(request);
    if (auth.error) return auth.error;

    const photoId = request.params.id;
    const body = await request.json().catch(() => ({}));
    const text = (body.text || '').trim();

    if (!text) return { status: 400, jsonBody: { error: 'Comment text required' } };
    if (text.length > 500) return { status: 400, jsonBody: { error: 'Comment too long (max 500 chars)' } };

    const comment = {
      id: uuidv4(),
      photoId,
      userId: auth.user.id,
      userName: auth.user.name,
      text,
      sentiment: detectSentiment(text),
      createdAt: new Date().toISOString(),
    };

    const { resource } = await containers.comments.items.create(comment);
    return { status: 201, jsonBody: resource };
  },
});