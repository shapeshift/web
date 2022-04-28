const path = require('path')
const outDir = Cypress.env('hars_folders') || 'cypress/hars'
const excludePaths = Cypress.env('excludePaths') || []
const includeHosts = Cypress.env('includeHosts') || []
const recordSpecs = Cypress.env('recordSpecs') || []

const specName = path.basename(Cypress.spec.name, path.extname(Cypress.spec.name))

export function autoRecord() {
  let harsMap: any = null

  before(function () {
    cy.task('readFile', path.join(outDir, `${specName}.har`)).then((data: any) => {
      if (data) {
        harsMap = data.log.entries.reduce(
          (acc: any, e: any) =>
            Object.defineProperty(acc, e.request.url, {
              configurable: true,
              writable: true,
              enumerable: true,
              value: e,
            }),
          {},
        )
        if (recordSpecs.includes(specName)) {
          cy.recordHar({ excludePaths, includeHosts })
        }
      } else {
        cy.recordHar({ excludePaths, includeHosts })
      }
    })
  })

  beforeEach(function () {
    cy.intercept('*', req => {
      const har = harsMap ? harsMap[req.url] : null

      if (har && !har.response.content.error) {
        switch (har.response.content.mimeType) {
          case 'application/json': {
            req.reply(JSON.parse(har.response.content.text))
            break
          }
          case 'image/png': {
            req.reply({ fixture: 'images/logo.png' })
            break
          }
          default: {
            req.reply(har.response.content.text)
          }
        }
      }
    })
  })

  after(function () {
    if (recordSpecs.includes(specName) || !harsMap) {
      cy.saveHar()
    }
  })
}
