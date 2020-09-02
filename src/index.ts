import * as httpReq from 'superagent';
import { JSDOM } from 'jsdom';
import sanitizeHtml = require('sanitize-html');

import { readStorage, writeStorage } from './utils/storage';
import { Article } from './global';

const HEMS_URL = 'http://bg.hems.de/aktuell/wichtige-informationen/';

httpReq.get(HEMS_URL)
  .then((res) => {
    if (res.status == 200) {
      const storage = readStorage();
      const newArticles: Article[] = [];

      const document = new JSDOM(res.text, {
        url: HEMS_URL,
        referrer: 'https://bg-info.sprax2013.de/'
      }).window.document;

      for (const elem of document.querySelectorAll('.csc-default')) {
        if (!elem.id) continue;

        if (!storage.knownArticles.includes(elem.id)) {
          let content = elem.querySelector('.csc-textpic-text')?.innerHTML || null;

          // We use innerHTML because innerText is not implemented in jsdom.
          // This way, we can force line breaks (too agressively but who's noticing that).
          // Best implementation I can think of without using a headless browser
          if (content) {
            content = sanitizeHtml(content.replace(/>/g, '>\n'), { allowedTags: [] })
              .replace(/[\r\n]+/g, '\n');
          }

          newArticles.push({
            id: elem.id,
            title: elem.querySelector('h1,h2,h3,h4,h5,h6')?.textContent || null,
            content,
            image: elem.querySelector('img[src]')?.getAttribute('src') || null
          });

          storage.knownArticles.push(elem.id);
        }
      }

      console.log('New articles:', newArticles.length);

      for (const article of newArticles) {
        sendDiscordWebhook('https://discordapp.com/api/webhooks/750279207455555647/isqTySl9xQ4dOgjjsodrmzvw2xYCFNqDmUjMJKw4RbNyLI0cUW0OhIbFqVVFkPqMOHQ_', article);
      }

      // TODO: Write when successfully notified *somewhere*
      // writeStorage(storage);
    } else {
      console.error(`Could not fetch url: Status ${res.status} for ${HEMS_URL}`);
    }
  })
  .catch(console.error);

async function sendDiscordWebhook(url: string, article: Article): Promise<void> {
  return new Promise((resolve, reject) => {
    httpReq.post(`${url}?wait=true`)
      // .set('User-Agent', '// TODO')
      .set('Accept', 'application/json')
      .set('Content-Type', 'application/json')
      .send({
        username: 'BG-Info Notifier',
        avatar_url: 'https://bg-info.sprax2013.de/img/HEMS.jpg',
        content: 'Auf https://bg.hems.de wurde ein neuer Artikel veröffentlicht',
        allowed_mentions: {
          parse: []
        },
        embeds: [
          {
            author: {
              name: 'BG-Info Notifier',
              url: 'https://bg-info.sprax2013.de/',
              icon_url: 'https://sprax2013.de/images/Logo_HD.png'
            },
            footer: {
              text: new Date().toLocaleString(),
              icon_url: ''
            },
            image: {
              url: article.image ?? ''
            },

            url: 'https://bg.hems.de',
            color: 16738378,

            title: article.title ?? '*Ohne Titel*',
            description: article.content ?? ''
          }
        ]
      })
      .end((err, res) => {
        console.debug(`Discord sent status ${res.status}`);

        if (res.status >= 300) return reject(err || new Error(`Discord responded with status ${res.status}`));

        resolve();
      });
  });
}