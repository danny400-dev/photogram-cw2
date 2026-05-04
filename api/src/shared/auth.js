/**
 * Extract user identity from incoming request.
 * In production, this will validate a JWT from Microsoft Entra ID.
 * For now (Step 7 local testing), we accept a custom header set by the frontend
 * to simulate logged-in users. Step 8 replaces this with real Entra validation.
 */
function getUser(request) {
  // Local testing mode — read 'x-ms-client-principal' header (base64 JSON)
  const principalHeader = request.headers.get('x-ms-client-principal');
  if (principalHeader) {
    try {
      const decoded = Buffer.from(principalHeader, 'base64').toString('utf-8');
      const principal = JSON.parse(decoded);
      return {
        id: principal.userId || principal.userDetails,
        email: principal.userDetails,
        name: principal.userDetails,
        roles: principal.userRoles || [],
      };
    } catch (e) {
      console.warn('Could not parse client principal header:', e.message);
    }
  }

  // Dev fallback — set X-Dev-User header to simulate a user during testing
  const devUser = request.headers.get('x-dev-user');
  const devRole = request.headers.get('x-dev-role') || 'consumer';
  if (devUser) {
    return {
      id: devUser,
      email: `${devUser}@dev.local`,
      name: devUser,
      roles: ['authenticated', devRole],
    };
  }

  return null;
}

function isCreator(user) {
  return user && user.roles && user.roles.includes('creator');
}

function requireAuth(request) {
  const user = getUser(request);
  if (!user) {
    return { error: { status: 401, jsonBody: { error: 'Authentication required' } } };
  }
  return { user };
}

function requireCreator(request) {
  const result = requireAuth(request);
  if (result.error) return result;
  if (!isCreator(result.user)) {
    return { error: { status: 403, jsonBody: { error: 'Creator role required' } } };
  }
  return { user: result.user };
}

module.exports = { getUser, isCreator, requireAuth, requireCreator };