import { OpenApiGeneratorV3 } from '@asteasolutions/zod-to-openapi'
import { apiReference } from '@scalar/express-api-reference'
import express from 'express'
import { readFileSync } from 'fs'
import { join } from 'path'

import { registry } from '../registry'

const readDoc = (filename: string) => readFileSync(join(__dirname, '../docs', filename), 'utf-8')

const generateOpenApiDocument = () => {
  const generator = new OpenApiGeneratorV3(registry.definitions)

  const doc = generator.generateDocument({
    openapi: '3.0.0',
    info: {
      version: '1.0.0',
      title: 'ShapeShift Public API',
      description: readDoc('introduction.md'),
    },
    servers: [{ url: 'https://api.shapeshift.com' }, { url: 'http://localhost:3001' }],
  })

  doc.tags = [
    { name: 'Swap Widget SDK', description: readDoc('swap-widget-sdk.md') },
    { name: 'REST API Guide', description: readDoc('rest-api-guide.md') },
    ...(doc.tags ?? []),
  ]

  return doc
}

const router = express.Router()

const openApiDocument = generateOpenApiDocument()

const FAVICON_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><rect width="100" height="100" rx="20" fill="#386ff9"/><text x="50" y="72" font-size="60" text-anchor="middle" fill="white" font-family="sans-serif" font-weight="bold">S</text></svg>`

router.get('/favicon.ico', (_req, res) => {
  res.type('image/svg+xml').send(FAVICON_SVG)
})

router.get('/json', (_req, res) => {
  res.json(openApiDocument)
})

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
