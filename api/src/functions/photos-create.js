const { app } = require('@azure/functions');
const { v4: uuidv4 } = require('uuid');
const { containers } = require('../shared/cosmos');
const { analyzeImage } = require('../shared/vision');
const { publicBlobUrl } = require('../shared/blob');
const { requireCreator } = require('../shared/auth');

app.http('photos-create', {
  methods: ['POST'],
  authLevel: 'anonymous',
  route: 'photos',
  handler: async (request, context) => {
    const auth = requireCreator(request);
    if (auth.error) return auth.error;

    const body = await request.json().catch(() => ({}));
    const { blobName, title, caption, location, peopleTagged } = body;

    if (!blobName || !title) {
      return { status: 400, jsonBody: { error: 'blobName and title are required' } };
    }

    const blobUrl = publicBlobUrl(blobName);

    // Call Azure AI Vision to auto-tag the photo (the headline advanced feature!)
    context.log(`Analyzing photo with AI Vision: ${blobUrl}`);
    const analysis = await analyzeImage(blobUrl);
    context.log(`Vision returned ${analysis.tags.length} tags, adult=${analysis.isAdultContent}`);

    // Block adult content (content moderation = bonus advanced feature)
    if (analysis.isAdultContent) {
      return {
        status: 400,
        jsonBody: { error: 'Photo flagged by content moderation. Please upload appropriate content.' },
      };
    }

    const photo = {
      id: uuidv4(),
      creatorId: auth.user.id,
      creatorName: auth.user.name,
      title: String(title).slice(0, 100),
      caption: caption ? String(caption).slice(0, 500) : '',
      location: location ? String(location).slice(0, 100) : '',
      peopleTagged: Array.isArray(peopleTagged) ? peopleTagged.slice(0, 20) : [],
      blobName,
      blobUrl,
      aiTags: analysis.tags,
      aiDescription: analysis.description,
      uploadedAt: new Date().toISOString(),
      ratingCount: 0,
      ratingSum: 0,
      commentCount: 0,
    };

    const { resource } = await containers.photos.items.create(photo);
    return { status: 201, jsonBody: resource };
  },
});