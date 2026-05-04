const { BlobServiceClient, generateBlobSASQueryParameters, BlobSASPermissions, StorageSharedKeyCredential } = require('@azure/storage-blob');

const connectionString = process.env.STORAGE_CONNECTION_STRING;
const accountName = process.env.STORAGE_ACCOUNT_NAME;
const containerName = process.env.BLOB_CONTAINER_NAME || 'photos';

if (!connectionString) throw new Error('STORAGE_CONNECTION_STRING is required.');

const blobServiceClient = BlobServiceClient.fromConnectionString(connectionString);
const containerClient = blobServiceClient.getContainerClient(containerName);

// Extract account key from connection string for SAS generation
function getAccountKey() {
  const match = connectionString.match(/AccountKey=([^;]+)/);
  if (!match) throw new Error('Cannot parse AccountKey from connection string.');
  return match[1];
}

const sharedKeyCredential = new StorageSharedKeyCredential(accountName, getAccountKey());

/**
 * Generate a short-lived SAS URL allowing the browser to directly upload to a blob.
 * The frontend will PUT the photo file directly to this URL — no traffic through Functions.
 */
function generateUploadSasUrl(blobName, expiryMinutes = 15) {
  const now = new Date();
  const expiresOn = new Date(now.getTime() + expiryMinutes * 60 * 1000);

  const sasToken = generateBlobSASQueryParameters({
    containerName,
    blobName,
    permissions: BlobSASPermissions.parse('cw'), // create + write
    startsOn: now,
    expiresOn,
    protocol: 'https',
  }, sharedKeyCredential).toString();

  return `https://${accountName}.blob.core.windows.net/${containerName}/${blobName}?${sasToken}`;
}

function publicBlobUrl(blobName) {
  return `https://${accountName}.blob.core.windows.net/${containerName}/${blobName}`;
}

module.exports = { containerClient, generateUploadSasUrl, publicBlobUrl };