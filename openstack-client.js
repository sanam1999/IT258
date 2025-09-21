// openstack-client.js
// Keystone v3 authentication + helpers for service endpoints
const axios = require('axios');
require('dotenv').config();

const AUTH_URL = (process.env.OS_AUTH_URL || '').replace(/\/+$/, ''); // trim trailing slash
const TIMEOUT = parseInt(process.env.OS_REQUEST_TIMEOUT || '20000', 10);

async function getTokenAndCatalog() {
  const body = {
    auth: {
      identity: {
        methods: ['password'],
        password: {
          user: {
            name: process.env.OS_USERNAME,
            domain: { name: process.env.OS_USER_DOMAIN_NAME || 'Default' },
            password: process.env.OS_PASSWORD
          }
        }
      },
      scope: {
        project: {
          name: process.env.OS_PROJECT_NAME,
          domain: { name: process.env.OS_PROJECT_DOMAIN_NAME || 'Default' }
        }
      }
    }
  };

  const resp = await axios.post(`${AUTH_URL}/v3/auth/tokens`, body, { timeout: TIMEOUT });
  const token = resp.headers['x-subject-token'];
  const tokenBody = resp.data.token;
  const catalog = tokenBody.catalog || [];
  const projectId = tokenBody.project ? tokenBody.project.id : null;
  return { token, catalog, projectId, expires_at: tokenBody.expires_at };
}

function endpointForService(catalog, type, interfaceType = 'public') {
  const svc = catalog.find(s => s.type === type);
  if (!svc) throw new Error(`Service ${type} not found in catalog`);
  const ep = svc.endpoints.find(e => e.interface === interfaceType);
  if (!ep) throw new Error(`No ${interfaceType} endpoint for service ${type}`);
  return ep.url.replace(/\/+$/, ''); // trim trailing slash
}

module.exports = { getTokenAndCatalog, endpointForService, AUTH_URL };
