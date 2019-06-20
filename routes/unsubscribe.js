const Utils = require('./../utils');
const db = require('./../db-utils/DB_BG-Info');

module.exports = (req, res, next) => {
  let token = req.query.token;

  if (!token) return next(Utils.createError(400, 'Bad Request'));

  if (token && !Utils.isUUID(Utils.addHyphensToUUIDv4(token))) return next(Utils.createError(400, 'Invalid Token'));

  db.getMailForPublicToken(token, (err, mail) => {
    if (err) return next(Utils.logAndCreateError(err));

    if (mail && mail['Verified']) {
      db.setUnsubscribedAndResetPublicToken(mail['ID'], true, (err) => {
        if (err) return next(Utils.logAndCreateError(err));

        function htmlCallback() {
          res.send(`<h1>Die Mailadresse <i>${mail['Mail']}</i> wird keine weiteren Mails erhalten. <small>Es kann bis zu 48 Stunden dauern, bis die Mailadresse aus der Datenbank gelöscht wurde</small><h1>`);
        }

        res.format({
          json: () => {
            res.json({ success: true });
          },

          html: htmlCallback,
          default: htmlCallback
        });
      });
    } else {
      next(Utils.createError(400, 'Invalid Token'));
    }
  });
};