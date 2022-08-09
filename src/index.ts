import * as fs from 'fs';
import { readFileSync } from 'fs';
import nodemailer from 'nodemailer';
import Mail from 'nodemailer/lib/mailer';
import { join as joinPath } from 'path';

import { Fetcher } from './Fetcher';
import { Config } from './files/Config';
import { Storage } from './files/Storage';
import { Article } from './global';
import { RabbitClient } from './utils/RabbitMQ/RabbitClient';
import { MailMessage } from './utils/RabbitMQ/RabbitMQ';
import { httpPost } from './utils/web';

export const appVersion: string = JSON.parse(fs.readFileSync(joinPath(__dirname, '..', 'package.json'), 'utf-8')).version ?? 'UNKNOWN_APP_VERSION';

const config = new Config();
const storage = new Storage();

const rabbitMq = new RabbitClient(config.data.RabbitMQ);
const mailTransporter = nodemailer.createTransport(config.data.mail);

for (const urlData of config.data.urls) {
  const fetcher = new Fetcher(urlData.id, urlData.url);

  const task = async (): Promise<void> => {
    return new Promise((resolve, reject) => {
      fetcher.fetchNewArticles(storage)
          .then(async (data): Promise<void> => {
            if (data.firstFetchEver) {
              console.log(`First time contacting ${urlData.name}! Found ${data.articles.length} articles (Nobody is getting notified this time - Only for new articles from this point on)`);
            } else {
              if (data.articles.length > 0) {
                console.log(`Found ${data.articles.length} new articles for '${urlData.id}' (${urlData.name}: ${urlData.url})`);
                // TODO: Log changed articles to admin but don't send broadcast

                // TODO: Make URL configurable
                const url = 'https://discord.com/api/webhooks/750279207455555647/isqTySl9xQ4dOgjjsodrmzvw2xYCFNqDmUjMJKw4RbNyLI0cUW0OhIbFqVVFkPqMOHQ_?wait=true';

                for (const article of data.articles) {
                  // Discord Webhooks
                  const webhookData = prepareDiscordWebhook(urlData, article);
                  try {
                    await rabbitMq.queueHttpOutgoing({
                      method: webhookData.method,
                      url,
                      headers: webhookData.headers,
                      bodyBase64: Buffer.from(JSON.stringify(webhookData.body)).toString('base64')
                    });
                  } catch (err) {
                    console.error(err);

                    try {
                      await sendDiscordWebhook(url, urlData, article);
                    } catch (err) {
                      console.error(err);
                    }
                  }
                }

                // TODO: Make 'to' configurable
                // Mails
                const mailData = prepareMail(urlData, 'sprax2013@gmail.com', 'Eine neue Meldung von der HEMS', data.articles);
                try {
                  await rabbitMq.queueMailOutgoing(mailData);
                } catch (err) {
                  console.error(err);

                  try {
                    await sendMail(mailTransporter, mailData);
                  } catch (err) {
                    console.error(err);
                  }
                }
              }
            }

            return resolve();
          })
          .catch(reject);
    });
  };

  setInterval(() => task().catch((err) => {
    if (!err.message.startsWith('connect ETIMEDOUT')) {
      console.error(err);
    }
  }), config.data.general.updateIntervalInSeconds * 1000);
}

function prepareMail(urlData: { id: string, name: string, url: string }, to: string, subject: string, articles: ReadonlyArray<Article>): MailMessage {
  let articlesHtml = '';
  let articlesMailText = '';

  for (const article of articles) {
    if (!article.content) continue;

    if (articlesHtml != '') {
      articlesHtml += '<hr>';
      articlesMailText += '\n\n- - -\n\n';
    }

    articlesHtml += `<h3><u>${article.title ?? 'Ohne Titel'}</u></h3>`;
    articlesHtml += article.content.replace(/\r?\n/g, '\n<br>');

    articlesMailText += `### ${article.title ?? '*Ohne Titel*'}\n\n`;
    articlesMailText += article.content;
  }

  const mailHtml = readFileSync(joinPath(__dirname, '..', 'resources', 'mail.html'), {encoding: 'utf-8'})
      // TODO: Use variable names instead of numbers
      .replace('{0}', subject)
      .replace('{1}', articlesHtml)
      .replace('{2}', to)
      .replace('{3}', '');    // TODO: Unsubscribe hash

  return {
    from: config.data.mail.from,
    to: to,

    subject: subject + `(${urlData.id})`,
    text: articlesMailText,
    html: mailHtml
  };
}

async function sendMail(mailTransporter: Mail, data: MailMessage): Promise<void> {
  if (!data.text && !data.html) throw new Error('No mail content has been provided');

  return mailTransporter.sendMail(data);
}

function prepareDiscordWebhook(urlData: { id: string, name: string, url: string }, article: Article): { method: 'POST', headers: { [key: string]: string }, body: object } {
  return {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json'
    },
    body: {
      username: 'HEMS Notifier',
      avatar_url: 'https://hems.sprax2013.de/img/HEMS-slim.jpg',
      content: `Es gibt eine neue Meldung von der HEMS (${urlData.id}) [${article.id}]:`,
      allowed_mentions: {parse: []},    // Disable all mentions
      embeds: [{
        url: `${urlData.url}?rel=hems.sprax2013.de#${article.id}`,
        color: 15678001,

        author: {
          name: 'HEMS Notifier',
          url: 'https://hems.sprax2013.de/notifier/',
          icon_url: 'https://sprax2013.de/images/Logo_HD.png'
        },

        title: article.title ?? '*Ohne Titel*',
        description: article.contentPreview ?? '',

        image: {
          url: article.imgUrl ?? ''
        },

        timestamp: new Date().toISOString()
      }]
    }
  };
}

async function sendDiscordWebhook(url: string, urlData: { id: string, name: string, url: string }, article: Article): Promise<void> {
  return new Promise((resolve, reject) => {
    const data = prepareDiscordWebhook(urlData, article);

    httpPost(`${url}?wait=true`, data.headers, data.body)
        .then((httpRes) => {
          if (httpRes.res.status < 200 ||
              httpRes.res.status > 204) {
            return reject(new Error(`Discord responded with status ${httpRes.res.status}`));
          } else {
            resolve();
          }
        })
        .catch(reject);
  });
}
