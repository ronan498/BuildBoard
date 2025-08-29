const { Pool } = require('pg');
const connectionString = process.env.DATABASE_URL;
const pool = new Pool({ connectionString });

const convert = (sql) => {
  let i = 1;
  return sql.replace(/\?/g, () => `$${i++}`);
};

module.exports = {
  query: (text, params) => pool.query(convert(text), params),
  prepare: (text) => {
    const converted = convert(text);
    return {
      run: async (...params) => {
        const res = await pool.query(converted, params);
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
