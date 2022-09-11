import * as fs from 'fs'
import fetch from 'node-fetch'
import * as path from 'path'
import { RegistryItem } from '../src/plugins/walletConnectToDapps/types'

const alphabet = 'abcdefghijklmnopqrstuvwxyz'.split('')

const registryJsonUrl =
  'https://explorer.walletconnect.com/_next/data/CWVJGGRcXLbAilG1CUAn3/index.json'

async function run() {
  const listings: RegistryItem[] = []
  for (const searchQuery of ['', ...alphabet]) {
    // eslint-disable-next-line no-console
    console.log('Scraping listings for query: ', { searchQuery })

    const newListings = await fetch(`${registryJsonUrl}?search=${searchQuery}`)
      .then(res => res.json())
      .then(res => res.pageProps.listings.filter((l: RegistryItem) => !listings.some(ll => l.id === ll.id)))
    listings.push(...newListings)
  }

  fs.writeFileSync(path.join(__dirname, '../src/plugins/walletConnectToDapps', 'registry.json'), JSON.stringify(listings, null, 2))
}

run()
