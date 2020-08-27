import * as httpReq from 'superagent';
import { JSDOM } from 'jsdom';

const HEMS_URL = 'http://bg.hems.de/aktuell/wichtige-informationen/';

httpReq.get(HEMS_URL)
  .then((res) => {
    const document = new JSDOM(res.text, {
      url: HEMS_URL,
      referrer: 'https://bg-info.sprax2013.de/'
    }).window.document;

    if (res.status == 200) {
      console.log('Articles:', document.querySelectorAll('.csc-default').length);
    } else {
      console.error(`Could not fetch url: Status ${res.status} for ${HEMS_URL}`);
    }
  })
  .catch(console.error);

// 'http://bg.hems.de/aktuell/wichtige-informationen/';