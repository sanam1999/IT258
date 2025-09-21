// controllers/images.js
const { getTokenAndCatalog, endpointForService } = require('../openstack-client');
const axios = require('axios');

async function listImages(req, res) {
  try {
    const { token, catalog } = await getTokenAndCatalog();
    const glanceUrl = endpointForService(catalog, 'image'); // glance
    const r = await axios.get(`${glanceUrl}/v2/images`, {
      headers: { 'X-Auth-Token': token },
      timeout: parseInt(process.env.OS_REQUEST_TIMEOUT || '20000', 10)
    });
    const images = r.data.images.map(i => ({ id: i.id, name: i.name, status: i.status, visibility: i.visibility }));
    res.json({ images });
  } catch (err) {
    console.error('listImages', err.message || err);
    res.status(500).json({ error: err.message || 'Error listing images' });
  }
}

async function listFlavors(req, res) {
  try {
    const { token, catalog } = await getTokenAndCatalog();
    const novaUrl = endpointForService(catalog, 'compute');
    const r = await axios.get(`${novaUrl}/flavors/detail`, { headers: { 'X-Auth-Token': token } });
    res.json({ flavors: r.data.flavors });
  } catch (err) {
    console.error('listFlavors', err.message || err);
    res.status(500).json({ error: err.message || 'Error listing flavors' });
  }
}

module.exports = { listImages, listFlavors };
