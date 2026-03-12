const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const { pool } = require('../db');

async function init() {
  const sqlPath = path.resolve(__dirname, '../../db/init.sql');
  const sql = fs.readFileSync(sqlPath, 'utf8');

  try {
    await pool.query(sql);
    console.log('Database initialized successfully.');
  } catch (error) {
    console.error('Failed to initialize database:', error.message);
    process.exitCode = 1;
  } finally {
    await pool.end();
  }
}

init();
