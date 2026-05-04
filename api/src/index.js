// Functions v4 entry point - registers all functions in the functions/ folder
const { app } = require('@azure/functions');

require('./functions/photos-upload-url');
require('./functions/photos-create');
require('./functions/photos-list');
require('./functions/photos-get');
require('./functions/photos-comment');
require('./functions/photos-rate');
require('./functions/get-roles');

console.log('Photogram API initialized.');