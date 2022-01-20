require('dotenv').config()

const execa = require('execa')
const findBrave = (): Cypress.Browser => {
  // the path is hard-coded for simplicity
  const browserPath = '/Applications/Brave Browser.app/Contents/MacOS/Brave Browser'

  return execa(browserPath, ['--version']).then((result: { stdout: string }) => {
    // STDOUT will be like "Brave Browser 77.0.69.135"
    // @ts-ignore
    const [, version] = /Brave Browser (\d+\.\d+\.\d+\.\d+)/.exec(result.stdout)
    const majorVersion = parseInt(version.split('.')[0])

    return {
      name: 'Brave',
      channel: 'stable',
      family: 'chromium',
      displayName: 'Brave',
      version,
      path: browserPath,
      majorVersion
    }
  })
}

/**
 * @type {Cypress.PluginConfig}
 */
module.exports = async (on: any, config: any) => {
  const brave = await findBrave()
  config.browsers = config.browsers.concat(brave)

  // Allow Cypress to see key Node environment variables via Cypress.env('some-variable')
  config.env.REACT_APP_UNCHAINED_ETHEREUM_HTTP_URL =
    process.env.REACT_APP_UNCHAINED_ETHEREUM_HTTP_URL
  config.env.REACT_APP_UNCHAINED_ETHEREUM_WS_URL = process.env.REACT_APP_UNCHAINED_ETHEREUM_WS_URL
  config.env.REACT_APP_UNCHAINED_BITCOIN_HTTP_URL = process.env.REACT_APP_UNCHAINED_BITCOIN_HTTP_URL
  config.env.REACT_APP_UNCHAINED_BITCOIN_WS_URL = process.env.REACT_APP_UNCHAINED_BITCOIN_WS_URL
  config.env.REACT_APP_PORTIS_DAPP_ID = process.env.REACT_APP_PORTIS_DAPP_ID
  config.env.REACT_APP_ETHEREUM_NODE_URL = process.env.REACT_APP_ETHEREUM_NODE_URL
  config.env.REACT_APP_METAMASK_DEEPLINK_URL = process.env.REACT_APP_METAMASK_DEEPLINK_URL

  return config
}
