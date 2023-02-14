import * as fs from 'fs'
import fetch from 'node-fetch'
import * as path from 'path'
import { RegistryItem, APIRegistryItem } from '../src/plugins/walletConnectToDapps/types'

const registryJsonUrl = 'https://explorer-api.walletconnect.com/v3/all?projectId=2f05ae7f1116030fde2d36508f472bfb'

async function run() {
  const listings: RegistryItem[] = []
  // eslint-disable-next-line no-console
  console.log('Scraping dApps listings from WalletConnect Cloud API...')

  const newListings = await fetch(registryJsonUrl)
      .then(response => response.json())
      .then(data => {
      const entries: APIRegistryItem[] = Object.values(data.listings)
      const filteredEntries = entries.filter(entry => entry.app_type !== 'wallet')
      // Mapping the WalledConnect API registry structure to our app registry structure.
      return filteredEntries.map(
        (entry: APIRegistryItem) => {
          return {
            category: entry.app_type,
            id: entry.id,
            homepage: entry.homepage,
            name: entry.name,
            image: entry.image_url.md
          }
        }
      )
    })
  listings.push(...newListings)
  fs.writeFileSync(path.join(__dirname, '../src/plugins/walletConnectToDapps', 'registry.json'), JSON.stringify(listings, null, 2))
  console.log(`${listings.length} entries scrapped.`)
}

run()
