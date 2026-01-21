import { apiReference } from '@scalar/express-api-reference'
import express from 'express'

import { generateOpenApiDocument } from '../docs/openapi'

const router = express.Router()

// Generate Spec
const openApiDocument = generateOpenApiDocument()

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
    authentication: {
      preferredSecurityScheme: 'apiKeyAuth',
      apiKey: {
        token: 'test-api-key-123',
      },
    },
    customCss: `
      .sidebar { --theme-color-1: #383838; }
    `,
  } as any),
)

export const docsRouter = router
