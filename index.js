/* StackOverflow ftw: https://stackoverflow.com/a/4673436/9346616 */
String.prototype.format = function () {
  let args = arguments;

  return this.replace(/{(\d+)}/g, function (match, number) {
    return typeof args[number] != 'undefined' ?
      args[number] :
      match;
  });
};

const request = require('request'),
  fs = require('fs'),
  mailer = require('nodemailer');

const { JSDOM } = require('jsdom');

const db = require('./db-utils/DB_BG-Info');

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

let knownArticles = require('./storage/storage.json').KnownArticles || [];
let mailQueue = require('./storage/storage.json').MailQueue || [];

function checkBGInfoPage() {
  request('http://bg.hems.de/', {
    method: 'GET',
    header: {
      Accept: 'text/html',
      'User-Agent': `BG-Info-Notifiert/${require('./package.json')['version']} (${process.platform || 'Unknown OS'}) (+https://bg-info.sprax2013.de/bot)`,
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

            for (const mail of mails) {
              mailQueue.push({ to: mail.mail, html: mailHTML.format(undefined, undefined, undefined, mail.mail, mail.token) });
            }

            saveStorageFile();
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
    async function send() {
      let info = await mailTransporter.sendMail({
        from: '"BG-Info-Notifier" <no-reply@sprax2013.de>',
        to: mailData.to,

        subject: 'Neuer Artikel auf bg.hems.de',
        // text: 'TODO: Textversion der Mail anhängen',
        html: mailData.html
      });

      console.log('Sent mail:', info.messageId);
    }

    send().catch((err) => {
      mailQueue.push(mailData);
      console.error(err);
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
setInterval(sendMails, 1000 * 60 * 10);  // Alle 10 Minuten: 10 Mails