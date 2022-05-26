/** @type {Record<string, Array<string>>} */
module.exports = {
  'connect-src': [
    process.env.REACT_APP_ETHEREUM_NODE_URL,
    process.env.REACT_APP_UNCHAINED_ETHEREUM_HTTP_URL,
    process.env.REACT_APP_UNCHAINED_ETHEREUM_WS_URL,
  ],
}
