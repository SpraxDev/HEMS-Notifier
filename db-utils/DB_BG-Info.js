const mysql = require('./MySQL');

module.exports = {
  /**
   * @param {Function} callback Params: err, mails
   */
  getValidMails(callback) {
    mysql.pool.getConnection((err, con) => {
      if (err) return callback(err);

      con.query('SELECT `Mail`,`PublicToken` FROM `Mails` WHERE `Unsubscribed` = 0 AND `Verified` = 1 AND `Failures` < 5;', [], (err, rows, _fields) => {
        con.release();

        if (err) return callback(err);

        let mails = [];

        for (const row in rows) {
          if (rows.hasOwnProperty(row)) {
            let elem = rows[row];

            mails.push({ mail: elem['Mail'], token: elem['PublicToken'] });
          }
        }

        return callback(null, mails);
      });
    });
  },

  /**
   * @param {String} mail
   * @param {Function} callback Params: err, mail
   */
  getMail(mail, callback) {
    mysql.pool.getConnection((err, con) => {
      if (err) return callback(err);

      con.query('SELECT * FROM `Mails` WHERE `Mail`=?;', [mail], (err, rows, _fields) => {
        con.release();

        if (err) return callback(err);

        return callback(null, rows.length > 0 ? JSON.parse(JSON.stringify(rows[0])) : null);
      });
    });
  },

  /**
   * @param {String} publicToken
   * @param {Function} callback Params: err, mail
   */
  getMailForPublicToken(publicToken, callback) {
    mysql.pool.getConnection((err, con) => {
      if (err) return callback(err);

      con.query('SELECT * FROM `Mails` WHERE `PublicToken`=?;', [publicToken], (err, rows, _fields) => {
        con.release();

        if (err) return callback(err);

        return callback(null, rows.length > 0 ? JSON.parse(JSON.stringify(rows[0])) : null);
      });
    });
  },

  /**
   * @param {Function} callback Params: err
   */
  setVerifiedAndResetPublicToken(id, verified, callback) {
    mysql.pool.getConnection((err, con) => {
      if (err) return callback(err);

      con.query('UPDATE `Mails` SET `Verified`=?,`PublicToken`=NULL WHERE `ID`=?;', [verified ? 1 : 0, id], (err, _rows, _fields) => {
        con.release();

        if (err) return callback(err);

        return callback(null);
      });
    });
  },

  /**
   * @param {Function} callback Params: err
   */
  setUnsubscribedAndResetPublicToken(id, unsubscribed, callback) {
    mysql.pool.getConnection((err, con) => {
      if (err) return callback(err);

      con.query('UPDATE `Mails` SET `Unsubscribed`=?,`PublicToken`=NULL WHERE `ID`=?;', [unsubscribed ? 1 : 0, id], (err, _rows, _fields) => {
        con.release();

        if (err) return callback(err);

        return callback(null);
      });
    });
  },

  /**
   * @param {String} mail 
   * @param {Function} callback Params: err, isInDB | isInDB is false if not found
   */
  isMailInDB(mail, callback) {
    mysql.pool.getConnection((err, con) => {
      if (err) return callback(err);

      con.query('SELECT `ID` FROM `Mails` WHERE `Mail`=?;', [mail], (err, rows, _fields) => {
        con.release();

        if (err) return callback(err);

        return callback(null, rows.length > 0);
      });
    });
  },

  /**
   * @param {String} mail 
   * @param {Function} callback Params: err, mail
   */
  addMail(mail, callback) {
    mysql.pool.getConnection((err, con) => {
      if (err) return callback(err);

      con.query('INSERT INTO `Mails` (`Mail`) VALUES (?);', [mail], (err, _rows, _fields) => {
        if (err) {
          con.release();
          return callback(err);
        }

        con.query('SELECT * FROM `Mails` WHERE `Mail`=?;', [mail], (err, rows, _fields) => {
          con.release();
          if (err) return callback(err);

          return callback(null, JSON.parse(JSON.stringify(rows[0])));
        });
      });
    });
  },

  /**
   * @param {Function} callback Params: err, json
   */
  getStats(callback) {
    mysql.pool.getConnection((err, con) => {
      if (err) return callback(err);

      con.query('SHOW INDEX FROM `Games`;', [], (err, rows, _fields) => {
        if (err) {
          con.release();
          return callback(err);
        }

        let estGameCount = rows[0]['Cardinality'],
          estUserCount, userCountWithUploads, estFileUploads, descriptionChars;

        con.query('SHOW INDEX FROM `User`;', [], (err, rows, _fields) => {
          if (err) {
            con.release();
            return callback(err);
          }

          estUserCount = rows[0]['Cardinality'];

          con.query('SHOW INDEX FROM `Files`;', [], (err, rows, _fields) => {
            if (err) {
              con.release()
              return callback(err);
            }

            estFileUploads = rows[0]['Cardinality'];

            con.query('SELECT SUM(CHAR_LENGTH(`Description`)) AS "CharCount" FROM `Games`;', [], (err, rows, _fields) => {
              if (err) {
                con.release()
                return callback(err);
              }

              descriptionChars = rows[0]['CharCount'];

              con.query('SELECT COUNT(DISTINCT `Author`) AS "Count" FROM `Games`;', [], (err, rows, _fields) => {
                con.release();

                if (err) return callback(err);

                userCountWithUploads = rows[0]['Count'];

                callback(null, {
                  estGameCount: estGameCount,
                  estUserCount: estUserCount,
                  userCountWithUploads: userCountWithUploads,
                  estFileUploads: estFileUploads,
                  descriptionChars: descriptionChars,

                  lastUpdate: Date.now()
                });
              });
            });
          });
        });
      });
    });
  }
};