const request = require('request'),
  fs = require('fs'),
  mailer = require('nodemailer');

const { JSDOM } = require('jsdom');

const Utils = require('./utils'),
  db = require('./db-utils/DB_BG-Info');

const MAIL_TEMPLATE = fs.readFileSync('./mail.html', { encoding: 'UTF-8' });

if (!fs.existsSync('./storage')) fs.mkdirSync('./storage');
if (!fs.existsSync('./storage/storage.json')) fs.writeFileSync('./storage/storage.json', '{"KnownArticles":[],"mailQueue":{}}');
if (!fs.existsSync('./storage/db.json')) {
  fs.writeFileSync('./storage/db.json', JSON.stringify(
    {
      host: '127.0.0.1',
      port: 3306,
      user: 'BG-Info',
      password: 's3cr3t!',

      database: 'BG-Info'
    }
    , null, 4));

  console.log('./storage/db.json has been created!');
}
if (!fs.existsSync('./storage/mail.json')) {
  fs.writeFileSync('./storage/mail.json', JSON.stringify(
    {
      host: '127.0.0.1',
      port: 587,
      auth: {
        user: 'bg-info@sprax2013.de',
        pass: 's3cr3t!'
      }
    }
    , null, 4));

  console.log('./storage/mail.json has been created!');
}

const mailTransporter = mailer.createTransport(require('./storage/mail.json'));
module.exports.mailTransporter = mailTransporter;

let knownArticles = require('./storage/storage.json').KnownArticles || [];
let mailQueue = require('./storage/storage.json').MailQueue || [];

function checkBGInfoPage() {
  request('http://bg.hems.de/', {
    method: 'GET',
    header: {
      Accept: 'text/html',
      'User-Agent': `Mozilla/5.0+(compatible; BG-Info-Notifiert/${require('./package.json')['version']}; https://bg-info.sprax2013.de/bot) (${process.platform || 'Unknown OS'})`,
      'Upgrade-Insecure-Requests': 1
    }
  }, (err, res, body) => {
    if (err) return console.error(err);
    if (res.statusCode >= 400) return console.error('Non-OK Status-Code from BG-Info:', res.statusCode);

    let lastBody = /*fs.existsSync('./storage/lastBody.html') ? fs.readFileSync('./storage/lastBody.html') :*/ '';

    if (body != lastBody) {
      fs.writeFile('./storage/lastBody.html', body, 'UTF-8', (err) => {
        if (err) return console.error(err);

        let doc = new JSDOM(body, {
          url: res.request.uri.href,
          referrer: 'https://Sprax2013.de/',
          contentType: 'text/html'
        }).window.document;

        let newArticles = [];

        for (const elem of doc.getElementById('content').getElementsByClassName('main').item(0).getElementsByTagName('div')) {
          if (elem.id && elem.id.startsWith('c')) {
            if (!knownArticles.includes(elem.id)) {
              newArticles.push(elem);
            }
          }
        }

        if (newArticles.length > 0) {
          console.log('Found %s new articles', newArticles.length);

          let articles = '';
          for (const elem of newArticles) {
            for (const child of elem.getElementsByTagName('*')) {
              child.removeAttribute('class');
              child.removeAttribute('style');
              child.removeAttribute('data-csc-images');
              child.removeAttribute('data-csc-cols');
            }

            for (const imgChild of elem.getElementsByTagName('img')) {
              imgChild.classList.add('img-fluid');
            }

            articles += '<article>' + elem.innerHTML + '</article>' + '<hr>';

            knownArticles.push(elem.id);
          }

          articles = articles.substring(0, articles.length - 4);

          const mailHTML = MAIL_TEMPLATE.format(`${newArticles.length} neue${newArticles.length == 1 ? 'r' : ''} Artikel | BG-Info-Notifier`,
            undefined, articles);

          db.getValidMails((err, mails) => {
            if (err) {
              saveStorageFile();
              return console.error(err);
            };

            let queuedMails = 0;
            for (const mail of mails) {
              mailQueue.push({ to: mail['Mail'], html: mailHTML.format(undefined, undefined, undefined, mail['Mail'], mail['PublicToken']) });
              queuedMails++;
            }

            saveStorageFile();
            console.log('Queued %s mail(s)', queuedMails);
          });
        }
      });
    }
  });
}

function sendMails() {
  let sentMail = false;

  for (let i = 0; i < 10; i++) {
    const mailData = mailQueue.shift() || undefined;

    if (!mailData) break;

    sentMail = true;

    // TODO: Textversion der Mail anhängen
    Utils.sendMail(mailTransporter, mailData.to, `Neue(r) Artikel auf bg.hems.de`, null, mailData.html)
      .catch((err) => {
        mailQueue.push(mailData);
        console.error(err);

        saveStorageFile();
      });
  }

  if (sentMail) saveStorageFile();
}

function saveStorageFile() {
  fs.writeFileSync('./storage/storage.json', JSON.stringify({
    KnownArticles: knownArticles,
    MailQueue: mailQueue
  }), 'UTF-8');
}

checkBGInfoPage();
sendMails();

setInterval(checkBGInfoPage, 1000 * 60 * 60 * 3);  // Alle 3h
setInterval(sendMails, 1000 * 60 * 15);            // Alle 15 Minuten: 10 Mails

const server = require('http').createServer(require('./server'));
server.on('error', (err) => {
  if (err.syscall !== 'listen') {
    throw err;
  }

  switch (err.code) {
    case 'EACCES':
      console.error(`Port ${process.env.PORT || 8096} requires elevated privileges`);
      process.exit(1);
      break;
    case 'EADDRINUSE':
      console.error(`Port ${process.env.PORT || 8096} is already in use`);
      process.exit(1);
      break;
    default:
      throw err;
  }
});
server.listen(process.env.PORT || 8096, process.env.HOST || '127.0.0.1');

// TODO: Disconnect from db etc.
// process.on('SIGINT', function () {
//   db.stop(function (err) {
//     process.exit(err ? 1 : 0);
//   });
// });