/// <reference types="cypress" />

import path from 'path'

/**
 * @type {Cypress.PluginConfig}
 */
module.exports = (on: any, config: any, fs: any) => {
  // `on` is used to hook into various events Cypress emits
  // `config` is the resolved Cypress config
  const mocksFolder = config.env.mocksFolder || 'cypress/mocks'

  const readFile = (filePath: string) => {
    if (fs.existsSync(filePath)) {
      return JSON.parse(fs.readFileSync(filePath, 'utf8'))
    }

    return null
  }

  const deleteFile = (filePath: string) => {
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath)
      return true
    }

    return null
  }

  const cleanMocks = () => {
    // TODO: create error handling
    const specFiles = fs.readdirSync(config.integrationFolder)
    const mockFiles = fs.readdirSync(mocksFolder)
    mockFiles.forEach((mockName: string) => {
      const isMockUsed = specFiles.find(
        (specName: string) => specName.split('.')[0] === mockName.split('.')[0],
      )
      if (!isMockUsed) {
        const mockData = readFile(path.join(mocksFolder, mockName))
        Object.keys(mockData).forEach(testName => {
          mockData[testName].forEach((route: any) => {
            if (route.fixtureId) {
              deleteFile(path.join(config.fixturesFolder, `${route.fixtureId}.json`))
            }
          })
        })

        deleteFile(path.join(mocksFolder, mockName))
      }
    })

    return null
  }

  const removeAllMocks = () => {
    if (fs.existsSync(mocksFolder)) {
      const mockFiles = fs.readdirSync(mocksFolder)
      mockFiles.forEach((fileName: string) => {
        deleteFile(path.join(mocksFolder, fileName))
      })
    }

    return null
  }

  on('task', {
    readFile,
    deleteFile,
    cleanMocks,
    removeAllMocks,
  })
}
