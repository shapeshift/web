require('dotenv').config()
const { execSync } = require('child_process')
const { resolve } = require('path')
const fs = require('fs')

const execa = require('execa')
const addAutoRecordPlugin = require('./autorecord/plugin')

const findBrave = (): Cypress.Browser | undefined => {
  const browserPath: string | undefined = (() => {
    switch (process.platform) {
      case 'darwin': {
        const braveMacOsPath = '/Applications/Brave Browser.app/Contents/MacOS/Brave Browser'
        const isBraveInstalled = fs.existsSync(braveMacOsPath)
        return isBraveInstalled ? braveMacOsPath : undefined
      }
      case 'linux': {
        const braveLinuxOsPath = execSync(
          resolve(process.cwd(), 'cypress/scripts/linux-brave-version.sh'),
        )
        return braveLinuxOsPath ? braveLinuxOsPath.toString().trim() : undefined
      }
      default: {
        return undefined
      }
    }
  })()

  return browserPath
    ? execa(browserPath, ['--version']).then((result: { stdout: string }) => {
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
              majorVersion,
            }
          : undefined
      })
    : undefined
}

/**
 * @type {Cypress.PluginConfig}
 */
module.exports = async (on: any, config: any) => {
  // adds cy.tasks provided by autorecord
  addAutoRecordPlugin(on, config, fs)

  if (config.testingType === 'component') {
    require('@cypress/react/plugins/react-scripts')(on, config)
  }

  const brave = await findBrave()
  if (brave) {
    config.browsers = config.browsers.concat(brave)
  }

  // Allow Cypress to see key Node environment variables via Cypress.env('some-variable')
  for (const [k, v] of Object.entries(process.env).filter(([k]) => k.startsWith('REACT_APP_'))) {
    config.env[k] = v
  }

  return config
}

export {}
