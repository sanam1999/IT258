// controllers/compute.js
const { getTokenAndCatalog, endpointForService } = require('../openstack-client');
const axios = require('axios');
const { nanoid } = require('nanoid');
const { readDB, writeDB } = require('../db');

const TIMEOUT = parseInt(process.env.OS_REQUEST_TIMEOUT || '20000', 10);

async function createServer(req, res) {
  /*
    body: {
      name, imageRef, flavorRef, networkId, keyName (optional), user_data (cloud-init, optional), security_groups: ['default']
    }
  */
  try {
    const { name, imageRef, flavorRef, networkId, keyName, user_data, security_groups } = req.body;
    if (!name || !imageRef || !flavorRef || !networkId) return res.status(400).json({ error: 'name,imageRef,flavorRef,networkId are required' });

    const { token, catalog } = await getTokenAndCatalog();
    const novaUrl = endpointForService(catalog, 'compute');

    const serverBody = {
      server: {
        name,
        imageRef,
        flavorRef,
        networks: [{ uuid: networkId }],
        key_name: keyName,
        user_data,
        security_groups: (security_groups || []).map(n => ({ name: n }))
      }
    };

    const r = await axios.post(`${novaUrl}/servers`, serverBody, { headers: { 'X-Auth-Token': token }, timeout: TIMEOUT });
    const rec = { id: nanoid(10), os_id: r.data.server.id, name: r.data.server.name, created_at: new Date().toISOString(), status: r.data.server.status || 'BUILD' };
    const db = readDB();
    db.servers.push(rec);
    writeDB(db);
    res.json({ server: rec, raw: r.data.server });
  } catch (err) {
    console.error('createServer', err.message || err);
    const status = err.response ? err.response.status : 500;
    res.status(status).json({ error: err.message || 'Error creating server', details: err.response ? err.response.data : undefined });
  }
}

async function deleteServer(req, res) {
  const id = req.params.id; // our id or os id (try both)
  try {
    const db = readDB();
    const rec = db.servers.find(s => s.id === id || s.os_id === id);
    if (!rec) return res.status(404).json({ error: 'server not found' });

    const { token, catalog } = await getTokenAndCatalog();
    const novaUrl = endpointForService(catalog, 'compute');
    await axios.delete(`${novaUrl}/servers/${rec.os_id}`, { headers: { 'X-Auth-Token': token }});
    db.servers = db.servers.filter(s => s.os_id !== rec.os_id);
    writeDB(db);
    res.json({ deleted: rec });
  } catch (err) {
    console.error('deleteServer', err.message || err);
    res.status(500).json({ error: err.message || 'Error deleting server' });
  }
}

async function getServerStatus(req, res) {
  const id = req.params.id;
  try {
    const db = readDB();
    const rec = db.servers.find(s => s.id === id || s.os_id === id);
    if (!rec) return res.status(404).json({ error: 'server not found' });
    const { token, catalog } = await getTokenAndCatalog();
    const novaUrl = endpointForService(catalog, 'compute');
    const r = await axios.get(`${novaUrl}/servers/${rec.os_id}`, { headers: { 'X-Auth-Token': token }});
    rec.status = r.data.server.status;
    writeDB(db);
    res.json({ server: r.data.server, meta: rec });
  } catch (err) {
    console.error('getServerStatus', err.message || err);
    res.status(500).json({ error: err.message || 'Error fetching server status' });
  }
}

async function resizeServer(req, res) {
  // body: { flavorRef: "<flavor-id>" }
  const id = req.params.id;
  try {
    const { flavorRef } = req.body;
    if (!flavorRef) return res.status(400).json({ error: 'flavorRef required' });
    const db = readDB();
    const rec = db.servers.find(s => s.id === id || s.os_id === id);
    if (!rec) return res.status(404).json({ error: 'server not found' });

    const { token, catalog } = await getTokenAndCatalog();
    const novaUrl = endpointForService(catalog, 'compute');
    await axios.post(`${novaUrl}/servers/${rec.os_id}/action`, { resize: { flavorRef }}, { headers: { 'X-Auth-Token': token }});
    rec.pending_action = { type: 'resize', flavorRef, initiated_at: new Date().toISOString() };
    writeDB(db);

    res.json({ message: 'resize initiated. Confirm or revert when server enters VERIFY_RESIZE', pending: rec.pending_action });
  } catch (err) {
    console.error('resizeServer', err.message || err);
    res.status(500).json({ error: err.message || 'Error resizing server' });
  }
}

async function confirmResize(req, res) {
  const id = req.params.id;
  try {
    const db = readDB();
    const rec = db.servers.find(s => s.id === id || s.os_id === id);
    if (!rec) return res.status(404).json({ error: 'server not found' });

    const { token, catalog } = await getTokenAndCatalog();
    const novaUrl = endpointForService(catalog, 'compute');
    await axios.post(`${novaUrl}/servers/${rec.os_id}/action`, { confirmResize: null }, { headers: { 'X-Auth-Token': token }});
    delete rec.pending_action;
    writeDB(db);
    res.json({ message: 'resize confirmed' });
  } catch (err) {
    console.error('confirmResize', err.message || err);
    res.status(500).json({ error: err.message || 'Error confirming resize' });
  }
}

module.exports = { createServer, deleteServer, getServerStatus, resizeServer, confirmResize };
