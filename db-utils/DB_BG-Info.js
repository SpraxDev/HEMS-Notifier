const generatePublicToken = require('uuid').v4,
  { Pool } = require('pg');
const pool = new Pool({
  host: require('./../storage/db.json')['host'],
  user: require('./../storage/db.json')['user'],
  password: require('./../storage/db.json')['password'],
  database: require('./../storage/db.json')['database'],
  max: 4,
  ssl: true
});
pool.on('error', (err, _client) => {
  console.error('Unexpected error on idle client:', err);
  // process.exit(-1);
});
// call `pool.end()` to shutdown the pool (waiting for queries to finish)

module.exports = {
  /**
   * @param {Function} callback Params: err, mails
   */
  getValidMails(callback) {
    pool.query(`SELECT "Mail","PublicToken" FROM "Mails" WHERE "Unsubscribed" =FALSE AND "Verified" =TRUE AND "Failures" <5;`, [], (err, res) => {
      if (err) return callback(err);

      let mails = [];

      for (const key in res.rows) {
        if (res.rows.hasOwnProperty(key)) {
          mails.push(res.rows[key]);
        }
      }

      return callback(null, mails);
    });
  },

  /**
   * @param {String} mail
   * @param {Function} callback Params: err, mail
   */
  getMail(mail, callback) {
    pool.query(`SELECT * FROM "Mails" WHERE "Mail"=$1;`, [mail], (err, res) => {
      if (err) return callback(err);

      return callback(null, res.rowCount > 0 ? res.rows[0] : null);
    });
  },

  /**
   * @param {String} publicToken
   * @param {Function} callback Params: err, mail
   */
  getMailForPublicToken(publicToken, callback) {
    pool.query(`SELECT * FROM "Mails" WHERE "PublicToken" =$1;`, [publicToken], (err, res) => {
      if (err) return callback(err);

      return callback(null, res.rowCount > 0 ? res.rows[0] : null);
    });
  },

  /**
   * @param {Function} callback Params: err
   */
  setVerifiedAndResetPublicToken(id, verified, callback) {
    pool.query(`UPDATE "Mails" SET "Verified"=$1,"PublicToken"=$3 WHERE "ID"=$2;`, [verified, id, generatePublicToken().replace(/-/g, '')], (err, _res) => {
      if (err) return callback(err);

      return callback(null);
    });
  },

  /**
   * @param {Function} callback Params: err
   */
  setUnsubscribedAndResetPublicToken(id, unsubscribed, callback) {
    pool.query(`UPDATE "Mails" SET "Unsubscribed" =$1,"PublicToken" =$3 WHERE "ID" =$2;`, [unsubscribed, id, generatePublicToken().replace(/-/g, '')], (err, _res) => {
      if (err) return callback(err);

      return callback(null);
    });
  },

  /**
   * @param {String} mail 
   * @param {Function} callback Params: err, isInDB | isInDB is false if not found
   */
  isMailInDB(mail, callback) {
    pool.query(`SELECT EXISTS(SELECT from "Mails" WHERE "Mail"=$1) AS "exists";`, [mail], (err, res) => {
      if (err) return callback(err);

      callback(null, res.rows[0]['exists']);
    });
  },

  /**
   * @param {String} mail 
   * @param {Function} callback Params: err, mail
   */
  addMail(mail, callback) {
    pool.query(`INSERT INTO "Mails"("Mail", "PublicToken") VALUES ($1,$2) RETURNING *;`, [mail, generatePublicToken().replace(/-/g, '')], (err, res) => {
      if (err) return callback(err);

      callback(null, res.rows[0]);
    });
  }
};