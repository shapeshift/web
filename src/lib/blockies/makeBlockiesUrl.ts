import { memoize } from 'lodash'

import type { BlockiesOptions } from './blockies'
import { buildBlockiesOptions, createImageData } from './blockies'

const imgData: Record<string, string> = Object.create(null)

const generateBlockiesUrl = (address: string, size = 8, caseSensitive = false, scale = 10) => {
  if (!address) throw new Error('Address is required')
  if (!caseSensitive) address = address.toLowerCase()

  if (imgData[`${size}:${address}`]) {
    return imgData[`${size}:${address}`]
  }

  const opts: BlockiesOptions = buildBlockiesOptions({ seed: address, size, scale })
  const imageData: number[] = createImageData(opts.size)

  const width = size * scale

  const svgMarkup = `
    <svg width="${width}" height="${width}" viewBox="0 0 ${width} ${width}" xmlns="http://www.w3.org/2000/svg">
      <rect width="${width}" height="${width}" fill="${opts.bgcolor}" />
      <g fill="${opts.color}">
        ${imageData.reduce((accumulator, value, i) => {
          if (value === 1) {
            const row = (i % size) * scale
            const col = Math.floor(i / size) * scale
            return accumulator + `<rect width="${scale}" height="${scale}" x="${row}" y="${col}" />`
          }
          return accumulator
        }, '')}
      </g>
      <g fill="${opts.spotcolor}">
        ${imageData.reduce((accumulator, value, i) => {
          if (value === 2) {
            const row = (i % size) * scale
            const col = Math.floor(i / size) * scale
            return accumulator + `<rect width="${scale}" height="${scale}" x="${row}" y="${col}" />`
          }
          return accumulator
        }, '')}
      </g>
    </svg>`

  const base64Url = `data:image/svg+xml;base64,${btoa(svgMarkup)}`

  imgData[`${size}:${address}`] = base64Url

  return base64Url
}

export const makeBlockiesUrl = memoize(generateBlockiesUrl)
