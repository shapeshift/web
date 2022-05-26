/** @type {Record<string, Array<string>>} */
module.exports = {
  'connect-src': [
    process.env.REACT_APP_UNCHAINED_COSMOS_HTTP_URL,
    process.env.REACT_APP_UNCHAINED_COSMOS_WS_URL,
  ],
  'img-src': [
    'https://raw.githubusercontent.com/cosmostation/',
    'https://raw.githubusercontent.com/cosmos/chain-registry/',
  ],
}
