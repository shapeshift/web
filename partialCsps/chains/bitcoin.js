/** @type {Record<string, Array<string>>} */
module.exports = {
  'connect-src': [
    process.env.REACT_APP_UNCHAINED_BITCOIN_HTTP_URL,
    process.env.REACT_APP_UNCHAINED_BITCOIN_WS_URL,
  ],
}
