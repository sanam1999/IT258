// controllers/network.js
const { getTokenAndCatalog, endpointForService } = require('../openstack-client');
const axios = require('axios');

async function listNetworks(req, res) {
  try {
    const { token, catalog } = await getTokenAndCatalog();
    const neutronUrl = endpointForService(catalog, 'network');
    const r = await axios.get(`${neutronUrl}/v2.0/networks`, { headers: { 'X-Auth-Token': token } });
    res.json({ networks: r.data.networks });
  } catch (err) {
    console.error('listNetworks', err.message || err);
    res.status(500).json({ error: err.message || 'Error listing networks' });
  }
}

async function createFloatingIP(req, res) {
  // expects body: { floating_network_id: "<external-net-id>" }
  try {
    const { floating_network_id } = req.body;
    if (!floating_network_id) return res.status(400).json({ error: 'floating_network_id required' });

    const { token, catalog } = await getTokenAndCatalog();
    const neutronUrl = endpointForService(catalog, 'network');
    const r = await axios.post(`${neutronUrl}/v2.0/floatingips`, {
      floatingip: { floating_network_id }
    }, { headers: { 'X-Auth-Token': token } });

    res.json({ floatingip: r.data.floatingip });
  } catch (err) {
    console.error('createFloatingIP', err.message || err);
    res.status(500).json({ error: err.message || 'Error creating floating ip' });
  }
}

async function associateFloatingIP(req, res) {
  // expects params: server_id, body: { floating_ip: "1.2.3.4" } OR { port_id }
  const serverId = req.params.server_id;
  const { floating_ip, port_id } = req.body;
  try {
    const { token, catalog } = await getTokenAndCatalog();
    const neutronUrl = endpointForService(catalog, 'network');
    let portToUse = port_id;
    if (!port_id) {
      const portsR = await axios.get(`${neutronUrl}/v2.0/ports?device_id=${serverId}`, { headers: { 'X-Auth-Token': token }});
      const ports = portsR.data.ports;
      if (!ports.length) return res.status(400).json({ error: 'Server port not found; pass port_id' });
      portToUse = ports[0].id;
    }
    if (floating_ip) {
      const fipsR = await axios.get(`${neutronUrl}/v2.0/floatingips?floating_ip_address=${floating_ip}`, { headers: { 'X-Auth-Token': token }});
      if (!fipsR.data.floatingips.length) return res.status(404).json({ error: 'Floating IP not found' });
      const fip = fipsR.data.floatingips[0];
      const updateR = await axios.put(`${neutronUrl}/v2.0/floatingips/${fip.id}`, { floatingip: { port_id: portToUse }}, { headers: { 'X-Auth-Token': token }});
      return res.json({ floatingip: updateR.data.floatingip });
    } else {
      const externalNetId = req.body.floating_network_id || req.query.floating_network_id;
      if (!externalNetId) return res.status(400).json({ error: 'floating_network_id required to allocate new floating IP' });
      const createR = await axios.post(`${neutronUrl}/v2.0/floatingips`, {
        floatingip: { floating_network_id: externalNetId, port_id: portToUse }
      }, { headers: { 'X-Auth-Token': token }});
      return res.json({ floatingip: createR.data.floatingip });
    }
  } catch (err) {
    console.error('associateFloatingIP', err.message || err);
    res.status(500).json({ error: err.message || 'Error associating floating ip' });
  }
}

module.exports = { listNetworks, createFloatingIP, associateFloatingIP };
