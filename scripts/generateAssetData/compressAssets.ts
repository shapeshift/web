import fs from 'fs'
import path from 'path'
import { promisify } from 'util'
import { brotliCompress, constants, gzip } from 'zlib'

import { GENERATED_DIR } from './constants'

const gzipAsync = promisify(gzip)
const brotliAsync = promisify(brotliCompress)

const isStale = async (sourcePath: string, compressedPath: string): Promise<boolean> => {
  try {
    const [sourceStat, compressedStat] = await Promise.all([
      fs.promises.stat(sourcePath),
      fs.promises.stat(compressedPath),
    ])
    return sourceStat.mtime > compressedStat.mtime
  } catch {
    return true
  }
}

const compressFile = async (filePath: string): Promise<void> => {
  const gzipPath = `${filePath}.gz`
  const brotliPath = `${filePath}.br`

  const [gzipStale, brotliStale] = await Promise.all([
    isStale(filePath, gzipPath),
    isStale(filePath, brotliPath),
  ])

  if (!gzipStale && !brotliStale) return

  const content = await fs.promises.readFile(filePath)

  if (gzipStale) {
    const gzipped = await gzipAsync(content, { level: 9 })
    await fs.promises.writeFile(gzipPath, gzipped)
  }

  if (brotliStale) {
    const brotlied = await brotliAsync(content, {
      params: {
        [constants.BROTLI_PARAM_MODE]: constants.BROTLI_MODE_TEXT,
        [constants.BROTLI_PARAM_QUALITY]: 11,
      },
    })
    await fs.promises.writeFile(brotliPath, brotlied)
  }
}

export const compressGeneratedAssets = async (): Promise<void> => {
  const jsonFiles = (await fs.promises.readdir(GENERATED_DIR)).filter(file =>
    file.endsWith('.json'),
  )

  await Promise.all(jsonFiles.map(file => compressFile(path.join(GENERATED_DIR, file))))
}

if (require.main === module) {
  compressGeneratedAssets()
    .then(() => process.exit(0))
    .catch(err => {
      console.error('Compression failed:', err)
      process.exit(1)
    })
}
