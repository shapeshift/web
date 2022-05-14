import path from 'path'
import { parse as parseUrl } from 'url'

import { blobToPlain } from './util'

const stringArrayOrEmpty = (maybeArray: any): string[] =>
  Array.isArray(maybeArray) && maybeArray.every(el => typeof el === 'string')
    ? (maybeArray as string[])
    : []

const booleanOrFalse = (maybeBoolean: any): boolean =>
  typeof maybeBoolean === 'boolean' ? maybeBoolean : false

const cypressConfig = Cypress.env('autorecord') || {}
const { cleanMocks, forceRecord, recordTests, includeHosts, whitelistHeaders } = cypressConfig
const shouldCleanMocks = booleanOrFalse(cleanMocks)
const shouldForceRecord = booleanOrFalse(forceRecord)
const testsToRecord = stringArrayOrEmpty(recordTests)
const includedHosts = stringArrayOrEmpty(includeHosts)
const whitelistedHeaders = stringArrayOrEmpty(whitelistHeaders)

// Intercept all requests
const interceptPattern = '*'

const supportedMethods = ['get', 'GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'HEAD']

const fileName = path.basename(Cypress.spec.name, path.extname(Cypress.spec.name))
const mocksFolder = cypressConfig.mocksFolder || 'cypress/mocks'

before(function () {
  if (shouldCleanMocks) {
    cy.task('cleanMocks')
  }

  if (shouldForceRecord) {
    cy.task('removeAllMocks')
  }
})

export function autoRecord() {
  const whitelistHeaderRegexes = whitelistedHeaders.map((str: string) => RegExp(str))

  // For cleaning, to store the test names that are active per file
  const testNames: string[] = []
  // For cleaning, to store the clean mocks per file
  const cleanMockData: any = {}
  // Locally stores all mock data for this spec file
  let routesByTestId: any = {}
  // For recording, stores data recorded from hitting the real endpoints
  let routes: any[] = []
  // For force recording, check to see if [r] is present in the test title
  let isTestForceRecord = false
  // Current test title
  let currentTestId = ''

  before(function () {
    // Get mock data that relates to this spec file
    cy.task('readFile', path.join(mocksFolder, `${fileName}.json`)).then(data => {
      routesByTestId = data === null ? {} : data
    })
  })

  beforeEach(function () {
    currentTestId = this.currentTest?.title || ''
    // Reset routes before each test case
    routes = []

    cy.intercept(interceptPattern, req => {
      // This is cypress loading the page
      if (Object.keys(req.headers).some(header => header === 'x-cypress-authorization')) {
        return
      }

      req.on('response', res => {
        const { url, method, body } = req
        const { host } = parseUrl(url, true)
        const status = res.statusCode
        const data = res.body.constructor.name === 'Blob' ? blobToPlain(res.body) : res.body
        const headers = Object.entries(res.headers)
          .filter(([key]) => whitelistHeaderRegexes.some((regex: RegExp) => regex.test(key)))
          .reduce((obj, [key, value]) => ({ ...obj, [key]: value }), {})

        // We push a new entry into the routes array
        const ifRequestIncluded = includedHosts.some(
          (hostPattern: string) => host != null && new RegExp(hostPattern).test(host),
        )
        if (includedHosts.length > 0) {
          if (!ifRequestIncluded) return
        }
        // Do not re-record duplicate requests
        const responseChanged = !routes.some(
          route =>
            route.url === url &&
            route.body === body &&
            route.method === method &&
            // when the response has changed for an identical request signature
            // add this entry as well.  This is useful for polling-oriented endpoints
            // that can have varying responses.
            route.response === data,
        )
        if (responseChanged) routes.push({ url, method, status, data, body, headers })
      })
    })

    // check to see if test is being force recorded
    // TODO: change this to regex so it only reads from the beginning of the string
    isTestForceRecord = currentTestId.includes('[r]')
    currentTestId = isTestForceRecord ? currentTestId.split('[r]')[1].trim() : currentTestId

    // Load stubbed data from local JSON file
    // Do not stub if...
    // This test is being force recorded
    // there are no mock data for this test
    if (
      !testsToRecord.includes(currentTestId) &&
      !isTestForceRecord &&
      routesByTestId[currentTestId]
    ) {
      // This is used to group routes by method type and url (e.g. { GET: { '/api/messages': {...} }})
      const sortedRoutes: any = {}
      supportedMethods.forEach(method => {
        sortedRoutes[method] = {}
      })

      routesByTestId[currentTestId].routes.forEach((request: any) => {
        if (!sortedRoutes[request.method][request.url]) {
          sortedRoutes[request.method][request.url] = []
        }

        sortedRoutes[request.method][request.url].push(request)
      })

      cy.intercept(interceptPattern, req => {
        if (!sortedRoutes[req.method] || !sortedRoutes[req.method][req.url]) return
        const newResponse = sortedRoutes[req.method][req.url][0]

        if (newResponse.headers['content-type'].startsWith('image/png')) {
          req.reply({ fixture: 'images/logo.png' })
        } else {
          req.reply(newResponse.status, newResponse.response, newResponse.headers)
        }
      })
    }

    // Store test name if shouldCleanMocks is true
    if (shouldCleanMocks) {
      testNames.push(currentTestId)
    }
  })

  afterEach(function () {
    // Check to see if the current test already has mock data or if forceRecord is on
    if (
      (!routesByTestId[currentTestId] ||
        isTestForceRecord ||
        testsToRecord.includes(currentTestId)) &&
      !shouldCleanMocks
    ) {
      // Construct endpoint to be saved locally
      const endpoints = routes.map(request => {
        return {
          url: request.url,
          method: request.method,
          status: request.status,
          headers: request.headers,
          body: request.body,
          response: request.data,
        }
      })

      // Store the endpoint for this test in the mock data object for this file if there are endpoints for this test
      if (endpoints.length > 0) {
        routesByTestId[currentTestId] = {
          routes: endpoints,
        }
      }
    }
  })

  after(function () {
    // Transfer used mock data to new object to be stored locally
    if (shouldCleanMocks) {
      Object.keys(routesByTestId).forEach(testName => {
        if (testNames.includes(testName)) {
          cleanMockData[testName] = routesByTestId[testName]
        }
      })
    }

    cy.writeFile(
      path.join(mocksFolder, `${fileName}.json`),
      shouldCleanMocks ? cleanMockData : routesByTestId,
    )
  })
}
