// app.js - main express server wiring routes
require('dotenv').config();
const express = require('express');
const bodyParser = require('body-parser');
const { init } = require('./db');

const imagesCtrl = require('./controllers/images');
const networkCtrl = require('./controllers/network');
const computeCtrl = require('./controllers/compute');
const volumesCtrl = require('./controllers/volumes');

const PORT = process.env.PORT || 3000;

const app = express();
app.use(bodyParser.json());

// health
app.get('/health', (req, res) => res.json({ status: 'ok', time: new Date().toISOString() }));

// images / flavors
app.get('/api/images', imagesCtrl.listImages);
app.get('/api/flavors', imagesCtrl.listFlavors);

// network
app.get('/api/networks', networkCtrl.listNetworks);
app.post('/api/floating-ips', networkCtrl.createFloatingIP);
app.post('/api/servers/:server_id/associate-floating-ip', networkCtrl.associateFloatingIP);

// compute
app.post('/api/servers', computeCtrl.createServer);
app.delete('/api/servers/:id', computeCtrl.deleteServer);
app.get('/api/servers/:id/status', computeCtrl.getServerStatus);
app.post('/api/servers/:id/resize', computeCtrl.resizeServer);
app.post('/api/servers/:id/confirm-resize', computeCtrl.confirmResize);

// volumes & snapshots
app.post('/api/volumes', volumesCtrl.createVolume);
app.post('/api/servers/:server_id/attach-volume', volumesCtrl.attachVolume);
app.post('/api/snapshots', volumesCtrl.createSnapshot);

// init DB then start
(async () => {
  await init();
  app.listen(PORT, () => console.log(`OpenStack control API listening on port ${PORT}`));
})();
