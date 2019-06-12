const request = require('request');
const fs = require('fs');
const mailer = require('nodemailer');

const jsdom = require('jsdom');
const { JSDOM } = jsdom;

if (!fs.existsSync('./storage')) fs.mkdirSync('./storage');

function checkBGInfoPage() {
  request('http://bg.hems.de/', {
    method: 'GET',
    header: {
      Accept: 'text/html',
      'User-Agent': `BG-Info-Notifier v${require('./package.json')['version']} by Sprax2013`,
      'Upgrade-Insecure-Requests': 1
    }
  }, (err, res, body) => {
    if (err) return console.error(err);
    if (res.statusCode >= 400) return console.error('Non-OK Status-Code from BG-Info:', res.statusCode);

    let last = fs.existsSync('./storage/lastBody.html') ? fs.readFileSync('./storage/lastBody.html') : '';

    // fs.writeFileSync('./temp.json', JSON.stringify(res.request.uri.href));

    let jsdom = new JSDOM(body);
    for (const elem of jsdom.window.document.querySelector('#content').querySelector('.main')) {
      console.log(elem.id);
    }

    if (last != body) {
      console.log('new body.length:', body.length);

      fs.writeFile('./storage/lastBody.html', body, 'UTF-8', (err) => {
        if (err) return console.error(err);

        // console.log(jsdom.window.document.querySelector('#content'));
        // console.log(jsdom.window.document.querySelector('#content').querySelector('.main'));

        async function sendMail() {
          let testAccount = await mailer.createTestAccount();

          let transporter = mailer.createTransport({
            host: 'smtp.ethereal.email',
            port: 587,
            secure: false, // true for 465, false for other ports
            auth: {
              user: testAccount.user, // generated ethereal user
              pass: testAccount.pass // generated ethereal password
            }
          });

          // send mail with defined transport object
          let info = await transporter.sendMail({
            from: '"BG-Info-Notifier" <no-reply@sprax2013.de>',
            to: 'sprax2013@gmail.com,sprax2013+test@gmail.com', // list of receivers

            subject: 'Hello ✔',
            text: 'Hello world?',
            html: '<b>Hello world!</b>'
          });

          // DEBUG
          console.log('Message sent:', info.messageId);
          console.log('Preview URL:', mailer.getTestMessageUrl(info));
        }

        sendMail().catch(console.error);
      });
    } else {
      console.log('old body.length:', body.length);
    }
  });
}

checkBGInfoPage();

setInterval(checkBGInfoPage, 1000 * 60 * 60 * 3);  // 3h