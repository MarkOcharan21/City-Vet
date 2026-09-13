const path = require('path');

// Load backend/.env and keep all relative paths rooted in backend/.
process.chdir(path.join(__dirname, 'backend'));

require(path.join(__dirname, 'backend', 'server.js'));