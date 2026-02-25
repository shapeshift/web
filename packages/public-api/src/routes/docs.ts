import { apiReference } from '@scalar/express-api-reference'
import express from 'express'

import { generateOpenApiDocument } from '../docs/openapi'

const router = express.Router()

// Generate Spec
const openApiDocument = generateOpenApiDocument()

// Serve favicon
const FAVICON_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><rect width="100" height="100" rx="20" fill="#386ff9"/><text x="50" y="72" font-size="60" text-anchor="middle" fill="white" font-family="sans-serif" font-weight="bold">S</text></svg>`

router.get('/favicon.ico', (_req, res) => {
  res.type('image/svg+xml').send(FAVICON_SVG)
})

// Serve raw JSON spec
router.get('/json', (_req, res) => {
  res.json(openApiDocument)
})

// Serve Scalar UI
router.use(
  '/',
  apiReference({
    spec: {
      content: openApiDocument,
    },
    pageTitle: 'ShapeShift API Reference',
    theme: 'purple',
    showSidebar: true,
    hideDownloadButton: true,
    darkMode: true,
    defaultOpenAllTags: true,
    customCss: `
      .sidebar { --theme-color-1: #383838; }
    `,
  } as any),
)

export const docsRouter = router
