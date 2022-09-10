import type { Context } from 'mocha'
import path from 'path'
import { parse as parseUrl } from 'url'

import { blobToPlain } from './util'

type Route = {
  url: string
  method: string
  status: number
  headers: Record<string, string>
  body: any
  data?: string
  response?: string
}

const stringOrEmpty = (maybeString: any): string =>
  typeof maybeString === 'string' ? maybeString : ''

const stringArrayOrEmpty = (maybeArray: any): string[] =>
  Array.isArray(maybeArray) && maybeArray.every(el => typeof el === 'string')
    ? (maybeArray as string[])
    : []

const booleanOrFalse = (maybeBoolean: any): boolean =>
  typeof maybeBoolean === 'boolean' ? maybeBoolean : false

const cypressConfig = Cypress.env() || {}
const { cleanMocks, forceRecord, recordTests, includeHosts, whitelistHeaders } = cypressConfig
const shouldCleanMocks = booleanOrFalse(cleanMocks)
const shouldForceRecord = booleanOrFalse(forceRecord)
const testsToRecord = stringArrayOrEmpty(recordTests)
const includedHosts = stringArrayOrEmpty(includeHosts)
const whitelistedHeaders = stringArrayOrEmpty(whitelistHeaders)

// Intercept all requests
const interceptPattern = '*'

const supportedMethods = ['get', 'GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'HEAD']

const fileName =
  stringOrEmpty(cypressConfig.mocksName) ||
  path.basename(Cypress.spec.name, path.extname(Cypress.spec.name))
const mocksFolder = stringOrEmpty(cypressConfig.mocksFolder) || 'cypress/mocks'

before(function () {
  if (shouldCleanMocks) {
    cy.task('cleanMocks')
  }

  if (shouldForceRecord) {
    // we don't save mocks to fixtures so we can skip this
    cy.task('removeAllMocks')
  }
})

export function autoRecord() {
  const whitelistHeaderRegexes = whitelistedHeaders.map((str: string) => RegExp(str))

  // For cleaning, to store the test names that are active per file
  const testNames: string[] = []
  // For cleaning, to store the clean mocks per file
  const cleanMockData: Record<string, { routes: Route[] }> = {}
  // Locally stores all mock data for this spec file
  let routesByTestId: Record<string, { routes: Route[] }> = {}
  // For recording, stores data recorded from hitting the real endpoints
  let routes: Route[] = []
  // For force recording, check to see if [r] is present in the test title
  let isTestForceRecord = false
  // Current test title
  let currentTestId = ''

  before(function () {
    // Get mock data that relates to this spec file
    cy.task('readFile', path.join(mocksFolder, `${fileName}.json`)).then(data => {
      routesByTestId = data === null ? {} : (data as Record<string, { routes: Route[] }>)
    })
  })

  beforeEach(function (this: Context) {
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

        const data = (() => {
          switch (res.body.constructor.name) {
            case 'Blob':
              return blobToPlain(res.body)
            case 'Object':
            case 'Array':
              return JSON.stringify(res.body)
            default:
              return res.body
          }
        })()
        const headers = Object.entries(res.headers)
          .filter(([key]) => whitelistHeaderRegexes.some((regex: RegExp) => regex.test(key)))
          .reduce((obj, [key, value]) => ({ ...obj, [key]: value }), {})

        // We push a new entry into the routes array
        const ifRequestIncluded = includedHosts.some(
          hostPattern => host != null && new RegExp(hostPattern).test(host),
        )
        if (includedHosts.length > 0 && !ifRequestIncluded) return
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
    // Do not stub if:
    // - This test is being force recorded, and
    // - There is no mock data for this test
    if (
      !testsToRecord.includes(currentTestId) &&
      !isTestForceRecord &&
      routesByTestId[currentTestId]
    ) {
      // This is used to group routes by method type and url (e.g. { GET: { '/api/messages': {...} }})
      const sortedRoutes: Record<string, Record<string, Route[]>> = {}
      supportedMethods.forEach(method => {
        sortedRoutes[method] = {}
      })

      routesByTestId[currentTestId].routes.forEach(request => {
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
        } else if (newResponse.headers['content-type'].startsWith('application/json')) {
          req.reply(newResponse.status, JSON.parse(newResponse.response!), newResponse.headers)
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
