import { JSDOM } from 'jsdom';
import sanitizeHtml from 'sanitize-html';
import { Storage } from './files/Storage';
import { Article } from './global';
import { getSha256 } from './utils/utils';
import { httpGet } from './utils/web';

export class Fetcher {
  private readonly id: string;
  private readonly url: string;

  constructor(id: string, url: string) {
    this.id = id;
    this.url = url;
  }

  async fetchNewArticles(storage: Storage): Promise<{ articles: Article[], firstFetchEver: boolean }> {
    return new Promise((resolve, reject) => {
      this.fetchHTML()
          .then((htmlStr) => {
            let firstFetchEver = false;

            if (!storage.data.knownArticles[this.id]) {
              storage.data.knownArticles[this.id] = {};
              firstFetchEver = true;
            }

            const knownArticles = storage.data.knownArticles[this.id];
            const newArticles: Article[] = [];

            // TODO: get SHA-256 of 'htmlStr' and report an error if it changed but no new articles found
            // TODO: Check if a recent article has been modified

            const doc = new JSDOM(htmlStr, {url: this.url}).window.document;
            doc.querySelectorAll('#content .main .csc-default')
                .forEach(elem => {
                  if (!elem.id) return;

                  let content = elem.querySelector('.csc-textpic-text')?.innerHTML || elem.innerHTML,
                      contentPreview = null;

                  // We use innerHTML because innerText is not implemented in jsdom.
                  // This way, we can force line breaks (too aggressively but who's going noticing that).
                  // Best implementation I can think of without using a headless browser
                  if (content) {
                    content = sanitizeHtml(content.replace(/>/g, '>\n'), {allowedTags: []})
                        .replace(/[\r\n]+/g, '\n').trim();
                  }

                  const indexFirstSentenceDone = (content ?? '').indexOf('.');
                  if (content != null && indexFirstSentenceDone != -1) {
                    if (indexFirstSentenceDone < 200) {
                      contentPreview = content.substring(0, indexFirstSentenceDone + 1);

                      if (indexFirstSentenceDone < content.length) {
                        contentPreview += ' [...]';
                      }
                    } else {
                      contentPreview = content?.substring(0, 150);

                      const i = contentPreview?.lastIndexOf('0');

                      if (i != -1) {
                        contentPreview?.substring(0, i);
                      }

                      contentPreview += ' [...]';
                    }
                  }

                  // We use the elements HTML without HTML because some urls within contain
                  // a timestamp and hash that is generated on each request... Why? idk.
                  const elemSha256 = getSha256(sanitizeHtml(elem.innerHTML, {allowedTags: []}).toLowerCase());

                  if (knownArticles[elem.id] != elemSha256) {
                    const article = {
                      id: elem.id,
                      sourceUrl: this.url,

                      title: elem.querySelector('h1,h2,h3,h4,h5,h6')?.textContent || null,
                      contentPreview,
                      content,
                      imgUrl: elem.querySelector('img[src]')?.getAttribute('src') || null,

                      didChange: (typeof knownArticles[elem.id] == 'string')
                    };

                    if ((article.content?.trim().length ?? 0) > 0 ||
                        (article.imgUrl?.trim().length ?? 0) > 0) {
                      newArticles.push(article);
                    } else {
                      console.error(`Found empty article:`, article);
                    }

                    knownArticles[elem.id] = elemSha256;
                  }
                });

            storage.save();

            resolve({articles: newArticles, firstFetchEver});
          })
          .catch(reject);
    });
  }

  async fetchHTML(): Promise<string> {
    return new Promise((resolve, reject) => {
      httpGet(this.url, {Accept: 'text/html'})
          .then((httpRes) => {
            if (httpRes.res.status == 200) {
              const contentType = httpRes.res.headers['content-type'];

              if (typeof contentType == 'string' &&
                  contentType.toLowerCase().startsWith('text/html')) {
                resolve(httpRes.body.toString('utf-8'));
              } else {
                reject(new Error(`Got unsupported Content-Type '${contentType}' from '${this.url}'`));
              }
            } else {
              reject(new Error(`Got HTTP code ${httpRes.res.status} from '${this.url}'`));
            }
          })
          .catch(reject);
    });
  }
}
