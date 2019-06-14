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

        res.json({ success: true });
      });
    } else {
      next(Utils.createError(400, 'Invalid Token'));
    }
  });
};