const { app } = require('@azure/functions');
const { getUser } = require('../shared/auth');

app.http('get-roles', {
  methods: ['GET'],
  authLevel: 'anonymous',
  route: 'me',
  handler: async (request, context) => {
    const user = getUser(request);
    if (!user) return { status: 200, jsonBody: { authenticated: false } };
    return { status: 200, jsonBody: { authenticated: true, ...user } };
  },
});