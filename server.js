const Utils = require('./utils');

const express = require('express'),
  morgan = require('morgan');

const logFormat = '[:date[web]] :remote-addr by :remote-user | :method :url :status with :res[content-length] bytes | ":user-agent" referred from ":referrer" | :response-time[3] ms';
const accessLogStream = require('rotating-file-stream')('access.log', {
  interval: '1d',
  maxFiles: 7,
  path: require('path').join(__dirname, 'logs', 'access'),
  compress: true
}),
  errorLogStream = require('rotating-file-stream')('error.log', {
    interval: '1d',
    maxFiles: 90,
    path: require('path').join(__dirname, 'logs', 'error'),
    compress: true
  });

const app = express();

app.disable('x-powered-by');

// Log to console and file
app.use(morgan('dev', { skip: function (_req, res) { return res.statusCode < 400; } }));
app.use(morgan(logFormat, { stream: accessLogStream }));
app.use(morgan(logFormat, { skip: function (_req, res) { return res.statusCode < 400; }, stream: errorLogStream }));

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
app.get('/status', require('./routes/status'));
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