// controllers/volumes.js
const { getTokenAndCatalog, endpointForService } = require('../openstack-client');
const axios = require('axios');
const { readDB, writeDB } = require('../db');

async function createVolume(req, res) {
  // body: { size, name, description }
  try {
    const { size, name, description } = req.body;
    if (!size) return res.status(400).json({ error: 'size (GB) required' });
    const { token, catalog } = await getTokenAndCatalog();
    const cinderUrl = endpointForService(catalog, 'volume');
    const r = await axios.post(`${cinderUrl}/v3/volumes`, { volume: { size, name, description }}, { headers: { 'X-Auth-Token': token }});
    const vol = r.data.volume;
    const db = readDB();
    db.volumes.push({ id: vol.id, name: vol.name, size: vol.size, created_at: new Date().toISOString() });
    writeDB(db);
    res.json({ volume: vol });
  } catch (err) {
    console.error('createVolume', err.message || err);
    res.status(500).json({ error: err.message || 'Error creating volume' });
  }
}

async function attachVolume(req, res) {
  // params: server_id, body: { volume_id }
  try {
    const serverId = req.params.server_id;
    const { volume_id } = req.body;
    if (!volume_id) return res.status(400).json({ error: 'volume_id required' });

    const { token, catalog } = await getTokenAndCatalog();
    const novaUrl = endpointForService(catalog, 'compute');
    await axios.post(`${novaUrl}/servers/${serverId}/os-volume_attachments`, { volumeAttachment: { volumeId: volume_id }}, { headers: { 'X-Auth-Token': token }});
    res.json({ message: 'attach requested' });
  } catch (err) {
    console.error('attachVolume', err.message || err);
    res.status(500).json({ error: err.message || 'Error attaching volume' });
  }
}

async function createSnapshot(req, res) {
  // create image from server (glance snapshot) OR Cinder snapshot from volume
  // body: { type: 'server'|'volume', server_id, volume_id, name }
  try {
    const { type, server_id, volume_id, name } = req.body;
    const { token, catalog } = await getTokenAndCatalog();
    const novaUrl = endpointForService(catalog, 'compute');
    const cinderUrl = endpointForService(catalog, 'volume');
    if (type === 'server') {
      if (!server_id) return res.status(400).json({ error: 'server_id required' });
      const r = await axios.post(`${novaUrl}/servers/${server_id}/action`, { createImage: { name: name || `snapshot-${Date.now()}` }}, { headers: { 'X-Auth-Token': token }});
      return res.json({ message: 'server snapshot requested', raw: r.data });
    } else if (type === 'volume') {
      if (!volume_id) return res.status(400).json({ error: 'volume_id required' });
      const r = await axios.post(`${cinderUrl}/v3/snapshots`, { snapshot: { volume_id, name: name || `snap-${Date.now()}` }}, { headers: { 'X-Auth-Token': token }});
      return res.json({ snapshot: r.data.snapshot });
    } else {
      return res.status(400).json({ error: "type must be 'server' or 'volume'" });
    }
  } catch (err) {
    console.error('createSnapshot', err.message || err);
    res.status(500).json({ error: err.message || 'Error creating snapshot' });
  }
}

module.exports = { createVolume, attachVolume, createSnapshot };
