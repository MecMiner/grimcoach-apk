const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// Permite importar arquivos .tflite via require()
config.resolver.assetExts.push('tflite');

module.exports = config;