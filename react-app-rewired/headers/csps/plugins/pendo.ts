import type { Csp } from '../../types'
import { cspMerge } from '../../util'

// These directives come from the "Full agent functionality and displaying guides
// in production" section of https://support.pendo.io/hc/en-us/articles/360032209131,
// with the addition of https://cdn.pendo.io to the connect-src list so we can apply
// agent fixups.
const agentCsp: Csp = {
  'connect-src': [
    'https://app.pendo.io',
    'https://cdn.pendo.io',
    'https://data.pendo.io',
    `https://pendo-static-${process.env.REACT_APP_PENDO_SUB_ID}.storage.googleapis.com`,
  ],
  'img-src': [
    'https://app.pendo.io',
    'https://cdn.pendo.io',
    'https://data.pendo.io',
    `https://pendo-static-${process.env.REACT_APP_PENDO_SUB_ID}.storage.googleapis.com`,
  ],
  'script-src': [
    // Use only the SRIs for specific fixed-up agent versions. (This gets logged to the
    // console when loading the agent, if you need to find and update it.)
    // 'https://cdn.pendo.io',
    'sha256-mPbQ+V61lkVMqofH9OKjanF5QgffZtZXXWfW/+1/aME=',
  ],
  'style-src': [
    'https://app.pendo.io',
    'https://cdn.pendo.io',
    `https://pendo-static-${process.env.REACT_APP_PENDO_SUB_ID}.storage.googleapis.com`,
  ],
}

// These directives come from the "Full agent functionality including the Designer"
// section of https://support.pendo.io/hc/en-us/articles/360032209131.
const agentAndDesignerCsp = cspMerge(agentCsp, {
  'script-src': [
    "'unsafe-inline'",
    "'unsafe-eval'",
    'https://app.pendo.io',
    'https://cdn.pendo.io',
    'https://data.pendo.io.pendo.io',
    'https://pendo-io-static.storage.googleapis.com',
    `https://pendo-static-${process.env.REACT_APP_PENDO_SUB_ID}.storage.googleapis.com`,
  ],
  'style-src': ["'unsafe-inline'"],
  // This is specified in the help article, but it can't be applied by meta tag and will error if we try.
  // 'frame-ancestors': ['https://app.pendo.io'],
  'child-src': ['https://app.pendo.io'],
  'frame-src': ['https://app.pendo.io'],
})

export const csp: Csp =
  process.env.REACT_APP_FEATURE_PENDO === 'true'
    ? process.env.REACT_APP_PENDO_UNSAFE_DESIGNER_MODE === 'true'
      ? agentAndDesignerCsp
      : agentCsp
    : {}
