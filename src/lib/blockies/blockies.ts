// Forked from https://github.com/download13/blockies

// The random number is a js implementation of the Xorshift PRNG
const randseed = new Array(4) // Xorshift: [x, y, z, w] 32 bit values

const seedrand = (seed: string) => {
  randseed.fill(0)

  for (let i = 0; i < seed.length; i++) {
    randseed[i % 4] = (randseed[i % 4] << 5) - randseed[i % 4] + seed.charCodeAt(i)
  }
}

const rand = () => {
  // based on Java's String.hashCode(), expanded to 4 32bit values
  const t = randseed[0] ^ (randseed[0] << 11)

  randseed[0] = randseed[1]
  randseed[1] = randseed[2]
  randseed[2] = randseed[3]
  randseed[3] = randseed[3] ^ (randseed[3] >> 19) ^ t ^ (t >> 8)

  return (randseed[3] >>> 0) / ((1 << 31) >>> 0)
}

const createRandomColor = () => {
  //saturation is the whole color spectrum
  const h = Math.floor(rand() * 360)
  //saturation goes from 40 to 100, it avoids greyish colors
  const s = (rand() * 60 + 40).toFixed(1) + '%'
  //lightness can be anything from 0 to 100, but probabilities are a bell curve around 50%
  const l = ((rand() + rand() + rand() + rand()) * 25).toFixed(1) + '%'

  return `hsl(${h}, ${s}, ${l})`
}

export const createImageData = (size: number) => {
  const width = size // Only support square icons for now
  const height = size

  const dataWidth = Math.ceil(width / 2)
  const mirrorWidth = width - dataWidth

  const data: number[] = []
  for (let y = 0; y < height; y++) {
    let row: number[] = []
    for (let x = 0; x < dataWidth; x++) {
      // this makes foreground and background color to have a 43% (1/2.3) probability
      // spot color has 13% chance
      row[x] = Math.floor(rand() * 2.3)
    }
    const r = row.slice(0, mirrorWidth)
    r.reverse()
    row = row.concat(r)

    for (let i = 0; i < row.length; i++) {
      data.push(row[i])
    }
  }

  return data
}

export const buildBlockiesOptions = (opts: { seed: string; size?: number; scale?: number }) => {
  seedrand(opts.seed)

  const newOpts: BlockiesOptions = {
    seed: opts.seed,
    size: opts.size || 8,
    scale: opts.scale || 10,
    color: createRandomColor(),
    bgcolor: createRandomColor(),
    spotcolor: createRandomColor(),
  }

  return newOpts
}

export interface BlockiesOptions {
  seed: string
  size: number
  scale: number
  color: string
  bgcolor: string
  spotcolor: string
}
