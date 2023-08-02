import * as fs from 'fs'
import fetch from 'node-fetch'
import * as path from 'path'
import type { APIRegistryItem, RegistryItem } from 'src/plugins/walletConnectToDapps/types'

const registryJsonUrl =
  'https://explorer-api.walletconnect.com/v3/all?projectId=2f05ae7f1116030fde2d36508f472bfb'

async function run() {
  // eslint-disable-next-line no-console
  console.log('Scraping dApps listings from WalletConnect Cloud API...')

  const newData: RegistryItem[] = await fetch(registryJsonUrl)
    .then(response => response.json())
    .then(data => {
      const entries: APIRegistryItem[] = Object.values(data.listings)
      const filteredEntries = entries.filter(entry => entry.app_type !== 'wallet')
      // Mapping the WalledConnect API registry structure to our app registry structure.
      return filteredEntries.map((entry: APIRegistryItem) => {
        return {
          category: entry.app_type,
          id: entry.id,
          homepage: entry.homepage,
          name: entry.name,
          image: entry.image_url.md,
        }
      })
    })

  const overrideData = JSON.parse(
    fs.readFileSync(
      path.join(__dirname, '../src/plugins/walletConnectToDapps', 'registry-overrides.json'),
      'utf8',
    ),
  )

  overrideData.forEach((newObject: any) => {
    const index = newData.findIndex((existingObject: any) => existingObject.id === newObject.id)
    if (index !== -1) {
      if (newObject.category.toLowerCase() === 'exclude') {
        // Remove excluded entry
        newData.splice(index, 1)
      } else {
        // Replace with overriding entry
        newData.splice(index, 1, newObject)
      }
    }
  })

  fs.writeFileSync(
    path.join(__dirname, '../src/plugins/walletConnectToDapps', 'registry.json'),
    JSON.stringify(newData, null, 2),
  )
  console.log(`${newData.length} entries scrapped.`)
}

run()
