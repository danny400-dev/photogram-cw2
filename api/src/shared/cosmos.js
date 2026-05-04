const { CosmosClient } = require('@azure/cosmos');

const endpoint = process.env.COSMOS_ENDPOINT;
const key = process.env.COSMOS_KEY;
const databaseName = process.env.COSMOS_DATABASE || 'photogramdb';

if (!endpoint || !key) {
  throw new Error('COSMOS_ENDPOINT and COSMOS_KEY environment variables are required.');
}

const client = new CosmosClient({ endpoint, key });
const database = client.database(databaseName);

const containers = {
  photos: database.container('photos'),
  comments: database.container('comments'),
  ratings: database.container('ratings'),
  users: database.container('users'),
};

module.exports = { client, database, containers };