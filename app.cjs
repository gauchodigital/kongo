'use strict';

import('./server/index.js').catch((error) => {
  console.error('Kongo CMS failed to start');
  console.error(error);
  process.exit(1);
});
