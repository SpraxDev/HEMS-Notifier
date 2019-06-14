const crypto = require('crypto');

const URL_PATTERN = new RegExp('^(?!mailto:)(?:(?:http|https|ftp)://)(?:\\S+(?::\\S*)?@)?(?:(?:(?:[1-9]\\d?|1\\d\\d|2[01]\\d|22[0-3])(?:\\.(?:1?\\d{1,2}|2[0-4]\\d|25[0-5])){2}(?:\\.(?:[0-9]\\d?|1\\d\\d|2[0-4]\\d|25[0-4]))|(?:(?:[a-z\\u00a1-\\uffff0-9]+-?)*[a-z\\u00a1-\\uffff0-9]+)(?:\\.(?:[a-z\\u00a1-\\uffff0-9]+-?)*[a-z\\u00a1-\\uffff0-9]+)*(?:\\.(?:[a-z\\u00a1-\\uffff]{2,})))|localhost)(?::\\d{2,5})?(?:(/|\\?|#)[^\\s]*)?$', 'i'),
  UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/* StackOverflow ftw: https://stackoverflow.com/a/4673436/9346616 */
String.prototype.format = function () {
  let args = arguments;

  return this.replace(/{(\d+)}/g, function (match, number) {
    return typeof args[number] != 'undefined' ?
      args[number] :
      match;
  });
};

/* Get'n Set methods by https://stackoverflow.com/a/33159592/9346616 */
Object.defineProperty(Object.prototype, 'getValue', {
  value: function (prop) {
    var key, self = this;

    for (key in self) {
      if (key.toLowerCase() == prop.toLowerCase()) {
        return self[key];
      }
    }
  },
  enumerable: false
});
Object.defineProperty(Object.prototype, 'setValue', {
  value: function (prop, val) {
    var key, self = this;
    var found = false;

    if (Object.keys(self).length > 0) {
      for (key in self) {
        if (key.toLowerCase() == prop.toLowerCase()) {
          // set existing property
          found = true;
          self[key] = val;

          break;
        }
      }
    }

    if (!found) {
      //if the property was not found, create it
      self[prop] = val;
    }

    return val;
  },
  enumerable: false
});

module.exports = {
  /**
   * @param {Number} HTTPStatusCode The HTTP-StatusCode
   * @param {String} message A short description (or message)
   * 
   * @returns {Error}
   */
  createError(HTTPStatusCode = 500, message = 'An unknown error has occurred') {
    let err = new Error(message);
    err.status = HTTPStatusCode;

    return err;
  },

  /**
   * @param {Error} error
   * 
   * @returns {Error}
   */
  logAndCreateError(error) {
    console.error(error);

    return module.exports.createError();
  },

  /**
   * @param {String} str 
   * 
   * @returns {Boolean}
   */
  toBoolean(str) {
    if (typeof str === 'string') return str === '1' || str.toLowerCase() === 'true';
    if (typeof str === 'number') return str === 1;
    if (typeof str === 'boolean') return str;

    return false;
  },

  /**
   * @param {String} str 
   * 
   * @returns {Boolean}
   */
  isOAuthCode(str) {
    return typeof str === 'string' && /^[a-z0-9]+$/i.test(str.toLowerCase());
  },

  /**
   * @param {String} str 
   * 
   * @returns {Boolean}
   */
  isURL(str) {
    return str.length < 2083 && URL_PATTERN.test(str);
  },

  /**
   * @param {String} str 
   * 
   * @returns {Boolean}
   */
  isUUID(str) {
    if (typeof str !== 'string') return false;

    str = str.toLowerCase();

    return UUID_PATTERN.test(str);
  },

  /**
   * @param {String} str 
   * 
   * @returns {String}
   */
  addHyphensToUUIDv4(str) {
    if (typeof str !== 'string') return false;

    return str.toLowerCase().replace('-', '').replace(/(\w{8})(\w{4})(\w{4})(\w{4})(\w+)/, '$1-$2-$3-$4-$5');
  },

  /**
   * @param {String|Number} str 
   * 
   * @returns {Number} A finite integer or NaN
   */
  toInteger(str) {
    if (typeof str === 'string') {
      let result = Number.parseInt(str);

      if (!Number.isNaN(result) && Number.isFinite(result)) return result;
    }

    return (typeof str === 'number') ? str : Number.NaN;
  },

  /**
   * Replaces all multiple spaces, tabs, etc. with a single space
   * 
   * @param {string} str 
   * 
   * @returns {string}
   */
  toNeutralString(str) {
    if (typeof str !== 'string') return null;

    return str.trim().replace(/\s\s+/g, ' ');
  },

  /**
  * @param {String} str 
  * 
  * @returns {String} SHA1 (hex)
  */
  getSHA1(str) {
    return crypto.createHash('SHA1').update(str).digest('hex');
  },

  /**
   * @param {String} filename 
   * 
   * @returns {String} empty string if not found
   */
  getFileExtention(filename) {
    let i = filename.lastIndexOf('.');

    if (i >= 0) {
      return filename.substring(i);
    }

    return '';
  },

  /**
   * @param {String} mimeType 
   * 
   * @returns {String} empty string if not found
   */
  getFileExtentionForMimeType(mimeType) {
    return MIME_TYPES[mimeType.toLowerCase()];
  },

  /**
   * @callback ReplacerCallback
   * @param {String} str
   */
  /**
   * 
   * @param {String} text 
   * @param {String} startToken 
   * @param {String} endToken 
   * @param {ReplacerCallback} callback 
   * 
   * @author NudelErde
   */
  replacer(text, startToken, endToken, callback) {
    let startIndex = text.indexOf(startToken);

    while (startIndex != -1) {
      startIndex += startToken.length;
      let tmp = text.substring(startIndex);
      let endIndex = tmp.indexOf(endToken);

      tmp = callback(tmp.substring(0, endIndex));

      text = text.substring(0, startIndex - startToken.length) + tmp + text.substring(startIndex + endIndex + endToken.length);
      startIndex = text.indexOf(startToken);
    }

    return text;
  },

  async sendMail(mailTransporter, to, subject, text = null, html = null) {
    let info = {
      from: '"BG-Info-Notifier" <no-reply@sprax2013.de>',
      to: to,
      subject: subject
    };

    if (text) {
      info.text = text;
    }
    if (html) {
      info.html = html;
    }

    let mail = await mailTransporter.sendMail(info);
    console.log('Sent mail:', mail.messageId);
  },

  EOL: require('os').EOL
};