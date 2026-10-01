const path = require('node:path');

/** Docusaurus plugin that applies the My Gamedev Tools brand to a site. */
function myGamedevToolsTheme() {
  return {
    name: '@mygamedevtools/docusaurus-theme',
    getClientModules() {
      return [require.resolve('./client.mjs')];
    },
  };
}

module.exports = myGamedevToolsTheme;

/** Add to `staticDirectories` to serve the logo files under /img/mgt/. */
module.exports.staticDir = path.join(__dirname, '..', 'static');
