// jest-dom adds custom jest matchers for asserting on DOM nodes.
// allows you to do things like:
// expect(element).toHaveTextContent(/react/i)
// learn more: https://github.com/testing-library/jest-dom
import '@testing-library/jest-dom'

import { server } from './test/msw-utils'

global.console = {
  ...console,
  debug: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
}

// open issues to get this patch eliminated
//  https://github.com/facebook/jest/issues/9983
//  https://github.com/jsdom/jsdom/issues/2524
if (typeof globalThis.TextEncoder === 'undefined') {
  const { TextEncoder, TextDecoder } = require('util')
  globalThis.TextEncoder = TextEncoder
  globalThis.TextDecoder = TextDecoder
}

beforeAll(() => {
  server!.listen({
    onUnhandledRequest: 'error',
  })
})

afterEach(() => server!.resetHandlers())

afterAll(() => {
  server!.close()
})
