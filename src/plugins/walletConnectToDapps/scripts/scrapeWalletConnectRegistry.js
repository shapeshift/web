const fs = require('fs')
const path = require('path')
const fetch = require('node-fetch')

const alphabet = 'abcdefghijklmnopqrstuvwxyz'.split('')

const registryJsonUrl =
  'https://explorer.walletconnect.com/_next/data/p88ImN-VjsDejK2p4EYtd/registry.json'

async function run() {
  const listings = []
  for (const searchQuery of ['', ...alphabet]) {
    // eslint-disable-next-line no-console
    console.log('Scraping listings for query: ', { searchQuery })

    const newListings = await fetch(`${registryJsonUrl}?search=${searchQuery}`)
      .then(res => res.json())
      .then(res => res.pageProps.listings.filter(l => !listings.some(ll => l.id === ll.id)))
    listings.push(...newListings)
  }

  fs.writeFileSync(path.join(__dirname, '..', 'registry.json'), JSON.stringify(listings, null, 2))
}

run()
