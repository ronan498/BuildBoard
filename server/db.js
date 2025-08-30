// server/db.js
const { Pool, types } = require('pg');

// Parse BIGINT (int8) as number instead of string
types.setTypeParser(20, (val) => (val === null ? null : parseInt(val, 10)));
// (Optional) parse NUMERIC as float (remove if you need exact decimals)
types.setTypeParser(1700, (val) => (val === null ? null : parseFloat(val)));

const connectionString = process.env.DATABASE_URL;

// Azure Postgres requires SSL. pg does NOT honor ?sslmode=require by itself.
const pool = new Pool({
  connectionString,
  ssl: { rejectUnauthorized: false },
});

// Convert SQLite-style '?' placeholders to Postgres '$1, $2, ...'
const convert = (sql) => {
  let i = 1;
  return sql.replace(/\?/g, () => `$${i++}`);
};

module.exports = {
  // Raw query with auto-conversion of placeholders
  query: (text, params) => pool.query(convert(text), params),

  // Lightweight "prepare" wrapper to mimic sqlite-style run/get/all APIs
  prepare: (text) => {
    const converted = convert(text);
    return {
      run: async (...params) => {
        const res = await pool.query(converted, params);
        // Return last inserted id if present (e.g., from RETURNING id)
        return { lastInsertRowid: res.rows[0]?.id };
      },
      get: async (...params) => {
        const res = await pool.query(converted, params);
        return res.rows[0];
      },
      all: async (...params) => {
        const res = await pool.query(converted, params);
        return res.rows;
      },
    };
  },

  pool,
};