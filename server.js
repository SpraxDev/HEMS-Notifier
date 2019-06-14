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

/* Frontend */
// app.get('/', require('./routes/index'));
// app.get('/index.html', require('./routes/index'));

// app.get('/legal', require('./routes/legal'));
// app.get('/privacy', require('./routes/privacy'));


// Prepare 404
app.use((_req, _res, next) => {
  next(Utils.createError(404, 'The requested resource could not be found.'));
});

// Send Error
app.use((err, req, res, _next) => {
  if (!err || !(err instanceof Error)) {
    err = Utils.createError();
  }

  if (!err.status || (err.status >= 500 && err.status < 600)) {
    console.error(err); // ToDo: Log to file
  }

  if (!res.headersSent) {
    res.status(err.status || 500);

    res.json({
      code: err.status || 500,
      msg: err.message
    });
  }
});

module.exports = app;