// db.js
const { Low } = require('lowdb');
const { JSONFile } = require('lowdb/node');
const fs = require('fs');
const path = require('path');

const DB_FILE = process.env.DB_FILE || './data/db.json';
const dir = path.dirname(DB_FILE);
if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

const adapter = new JSONFile(DB_FILE);
const db = new Low(adapter);

async function init() {
  await db.read();
  db.data = db.data || { servers: [], volumes: [] };
  await db.write();
}

function readDB() {
  const raw = fs.readFileSync(DB_FILE, 'utf8');
  const data = JSON.parse(raw || '{}');
  data.servers = data.servers || [];
  data.volumes = data.volumes || [];
  return data;
}

function writeDB(data) {
  fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2), 'utf8');
}

module.exports = { init, readDB, writeDB };
