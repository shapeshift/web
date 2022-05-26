import * as localforage from 'localforage'

export const getWalletDbInstance = (): LocalForage => {
  const walletIndexedDbName = Cypress.env('walletIndexedDbName')

  return localforage.createInstance({
    name: walletIndexedDbName,
    storeName: 'keyval',
    driver: localforage.INDEXEDDB,
  })
}
