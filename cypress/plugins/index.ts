require('dotenv').config()
const { execSync } = require('child_process')
const { resolve } = require('path')
const fs = require('fs')

const execa = require('execa')

const findBrave = (): Cypress.Browser | undefined => {
  const browserPath: string | undefined = (() => {
    switch (process.platform) {
      case 'darwin': {
        const braveMacOsPath = '/Applications/Brave Browser.app/Contents/MacOS/Brave Browser'
        const isBraveInstalled = fs.existsSync(braveMacOsPath)
        return isBraveInstalled ? braveMacOsPath : undefined
      }
      case 'linux': {
        const braveLinuxOsPath = execSync(resolve(process.cwd(), 'cypress/scripts/linux-brave-version.sh'))
        return braveLinuxOsPath ? braveLinuxOsPath.toString().trim() : undefined
      }
      default: {
        return undefined
      }
    }
  })()

  return execa(browserPath, ['--version']).then((result: { stdout: string }) => {
    // STDOUT will be like "Brave Browser 77.0.69.135"
    // @ts-ignore
    const [, version] = /Brave Browser (\d+\.\d+\.\d+\.\d+)/.exec(result.stdout)
    const majorVersion = parseInt(version.split('.')[0])

    return browserPath
      ? {
          name: 'Brave',
          channel: 'stable',
          family: 'chromium',
          displayName: 'Brave',
          version,
          path: browserPath,
          majorVersion
        }
      : undefined
  })
}

/**
 * @type {Cypress.PluginConfig}
 */
module.exports = async (on: any, config: any) => {
  if (config.testingType === 'component') {
    require('@cypress/react/plugins/react-scripts')(on, config)
  }

  const brave = await findBrave()
  if (brave) {
    config.browsers = config.browsers.concat(brave)
  }

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
