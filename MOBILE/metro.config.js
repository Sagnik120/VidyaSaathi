const path = require('path');
const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// The API client, the response types and the translations are shared with the
// website. They are imported (read-only) straight from FRONTEND/src/core, so the
// two apps can never drift apart. Nothing in FRONTEND is modified by this app.
config.watchFolders = [...(config.watchFolders ?? []), path.resolve(__dirname, '../FRONTEND/src/core')];

module.exports = config;
