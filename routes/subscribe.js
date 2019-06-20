const Utils = require('./../utils');
const db = require('./../db-utils/DB_BG-Info');

let regex = /^(([^<>()\[\]\.,;:\s@\"]+(\.[^<>()\[\]\.,;:\s@\"]+)*)|(\".+\"))@(([^<>()[\]\.,;:\s@\"]+\.)+[^<>()[\]\.,;:\s@\"]{2,})$/i;

const mailTransporter = require('./../index').mailTransporter;
const MAIL_VERIFY = 'Bitte bestätigen Sie Ihre E-Mail auf https://BG-Info.Sprax2013.de/subscribe?token={0}\r\n\r\nSollten Sie sich nicht auf BG-Info.Sprax2013.de angemeldet haben, so müssen Sie nichts weiter tun.\r\n\r\n\r\nBei Komplikationen können Sie mich gerne kontaktieren: developer@sprax2013.de';

module.exports = (req, res, next) => {
  let email = req.query.email,
    token = req.query.token;

  if (!email && !token) return next(Utils.createError(400, 'Bad Request'));

  if (email && !regex.test(email)) return next(Utils.createError(400, 'Invalid Address'));
  if (token && !Utils.isUUID(Utils.addHyphensToUUIDv4(token))) return next(Utils.createError(400, 'Invalid Token'));

  if (email) {
    db.isMailInDB(email, (err, isInDB) => {
      if (err) return next(Utils.logAndCreateError(err));

      if (isInDB) {
        db.getMail(email, (err, mail) => {
          if (err) return next(Utils.logAndCreateError(err));

          if (!mail) {
            db.addMail(email, (err, mail) => {
              if (err) return next(Utils.logAndCreateError(err));

              Utils.sendMail(mailTransporter, mail['Mail'], 'Bitte bestätigen Sie ihre E-Mail', MAIL_VERIFY.format(mail['PublicToken']))
                .then(() => {
                  function htmlCallback() {
                    res.send(`<h1>Die Mailadresse <i>${mail['Mail']}</i> befindet sich bereits in der Datenbank!<h1>`);
                  }

                  res.format({
                    json: () => {
                      res.json({ success: false, msg: 'Already subscribed' });
                    },

                    html: htmlCallback,
                    default: htmlCallback
                  });
                })
                .catch((err) => {
                  return next(Utils.logAndCreateError(err));
                });
            });
          } else if (mail['Unsubscribed']) {
            db.setUnsubscribedAndResetPublicToken(mail['ID'], false, (err) => {
              if (err) return next(Utils.logAndCreateError(err));

              db.setVerifiedAndResetPublicToken(mail['ID'], false, (err) => {
                if (err) return next(Utils.logAndCreateError(err));

                db.getMail(mail['Mail'], (err, mail) => {
                  if (err) return next(Utils.logAndCreateError(err));

                  Utils.sendMail(mailTransporter, mail['Mail'], 'Bitte bestätigen Sie ihre E-Mail', MAIL_VERIFY.format(mail['PublicToken']))
                    .then(() => {
                      function htmlCallback() {
                        res.send(`<h1>Die Mailadresse <i>${mail['Mail']}</i> befindet sich bereits in der Datenbank!<h1>`);
                      }

                      res.format({
                        json: () => {
                          res.json({ success: false, msg: 'Already subscribed' });
                        },

                        html: htmlCallback,
                        default: htmlCallback
                      });
                    })
                    .catch((err) => {
                      return next(Utils.logAndCreateError(err));
                    });
                });
              });
            });
          } else {
            function htmlCallback() {
              res.send(`<h1>Die Mailadresse <i>${mail['Mail']}</i> befindet sich bereits in der Datenbank!<h1>`);
            }

            res.format({
              json: () => {
                res.json({ success: false, msg: 'Already subscribed' });
              },

              html: htmlCallback,
              default: htmlCallback
            });
          }
        });
      } else {
        db.addMail(email, (err, mail) => {
          if (err) return next(Utils.logAndCreateError(err));

          Utils.sendMail(mailTransporter, mail['Mail'], 'Bitte bestätigen Sie ihre E-Mail', MAIL_VERIFY.format(mail['PublicToken']))
            .then(() => {
              function htmlCallback() {
                res.send(`<h1>Die Mailadresse <i>${mail['Mail']}</i> wurde der Datenbank hinzugefügt <small>In Kürze erhalten Sie eine Mail, um ${mail['Mail']} zu bestätigen</small><h1>`);
              }

              res.format({
                json: () => {
                  res.json({ success: true });
                },

                html: htmlCallback,
                default: htmlCallback
              });
            })
            .catch((err) => {
              return next(Utils.logAndCreateError(err));
            });
        });
      }
    });
  } else {
    db.getMailForPublicToken(token, (err, mail) => {
      if (err) return next(Utils.logAndCreateError(err));

      if (mail) {
        db.setVerifiedAndResetPublicToken(mail['ID'], true, (err) => {
          if (err) return next(Utils.logAndCreateError(err));

          function htmlCallback() {
            res.send(`<h1>Die Mailadresse <i>${mail['Mail']}</i> wurde erfolgreich bestätigt<h1>`);
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
  }
};