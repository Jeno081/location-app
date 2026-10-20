// ============================================
// db.js — Connexion MySQL (mysql2/promise)
// ============================================

const fs = require("fs");
const mysql = require("mysql2/promise");
const config = require("../config");

const poolOptions = {
  host: config.DB_HOST,
  port: config.DB_PORT,
  user: config.DB_USER,
  password: config.DB_PASSWORD,
  database: config.DB_NAME,
  waitForConnections: true,
  connectionLimit: config.DB_POOL_SIZE,
  queueLimit: 0,
  charset: "utf8mb4",
  // Les DATETIME sont renvoyés sous forme de chaînes "AAAA-MM-JJ HH:MM:SS",
  // comme avant avec SQLite : le frontend les parse sans conversion de fuseau.
  dateStrings: true,
  decimalNumbers: true
};

if (config.DB_SSL) {
  poolOptions.ssl = config.DB_SSL_CA
    ? { ca: fs.readFileSync(config.DB_SSL_CA, "utf8"), rejectUnauthorized: true }
    : { minVersion: "TLSv1.2", rejectUnauthorized: false };
}

const pool = mysql.createPool(poolOptions);

const ISO_RE = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?Z$/;

function toSqlValue(value) {
  if (value === undefined) return null;
  if (value instanceof Date) {
    return value.toISOString().slice(0, 19).replace("T", " ");
  }
  // Les dates ISO ("2026-10-05T08:30:00.000Z") ne sont pas acceptées telles
  // quelles par MySQL : on les normalise en "2026-10-05 08:30:00".
  if (typeof value === "string" && ISO_RE.test(value)) {
    return value.slice(0, 19).replace("T", " ");
  }
  return value;
}

function toSqlParams(params) {
  return (params || []).map(toSqlValue);
}

async function all(sql, params = []) {
  const [rows] = await pool.query(sql, toSqlParams(params));
  return rows;
}

async function get(sql, params = []) {
  const rows = await all(sql, params);
  return rows[0] || null;
}

async function run(sql, params = []) {
  const [result] = await pool.query(sql, toSqlParams(params));
  return { insertId: result.insertId, changes: result.affectedRows };
}

async function query(sql, params = []) {
  const [rows] = await pool.query(sql, toSqlParams(params));
  return rows;
}

function makeExecutor(connection) {
  const exec = async (sql, params = []) => {
    const [rows] = await connection.query(sql, toSqlParams(params));
    return rows;
  };
  return {
    all: (sql, params = []) => exec(sql, params),
    get: async (sql, params = []) => (await exec(sql, params))[0] || null,
    run: async (sql, params = []) => {
      const result = await exec(sql, params);
      return { insertId: result.insertId, changes: result.affectedRows };
    }
  };
}

async function transaction(work) {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    const result = await work(makeExecutor(connection));
    await connection.commit();
    return result;
  } catch (err) {
    try { await connection.rollback(); } catch (rollbackError) { /* connexion déjà perdue */ }
    throw err;
  } finally {
    connection.release();
  }
}

async function close() {
  await pool.end();
}

module.exports = { pool, query, get, all, run, transaction, close };
