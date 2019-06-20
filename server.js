const express = require('express');
const morgan = require('morgan');

const Utils = require('./utils');
// const db = require('./db-utils/DB_WB');

const app = express();

app.disable('x-powered-by');

app.use(morgan('dev'));

// Default response headers
app.use((_req, res, next) => {
  res.set({
    'Cache-Control': 'no-store,no-cache,must-revalidate',
    'Last-Modified': new Date()
  });

  next();
});

/* Backend */
app.get('/subscribe', require('./routes/subscribe'));
app.get('/unsubscribe', require('./routes/unsubscribe'));
// app.get('/sitemap.xml', require('./routes/sitemap').XML);
// app.get('/sitemap.txt', require('./routes/sitemap').TXT);
// app.get('/stats', require('./routes/stats'));


// Prepare 404
app.use((_req, _res, next) => {
  next(Utils.createError(404, 'The requested resource could not be found.'));
});

// Send Error
app.use((err, _req, res, _next) => {
  if (!err || !(err instanceof Error)) {
    err = Utils.createError();
  }

  if (!err.status || (err.status >= 500 && err.status < 600)) {
    console.error(err); // ToDo: Log to file
  }

  if (!res.headersSent) {
    res.status(err.status || 500);

    function htmlCallback() {
      res.send(`<!DOCTYPE html><html><head><meta charset="UTF-8"><title>${err.status || 500} ${err.message}</title></head><body><h1>${err.status || 500}</h1><p>${err.message}</p></body></html>`);
    }

    res.format({
      json: () => {
        res.json({
          code: err.status || 500,
          msg: err.message
        });
      },

      html: htmlCallback,
      default: htmlCallback
    });
  }
});

module.exports = app;