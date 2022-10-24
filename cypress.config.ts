import { defineConfig } from 'cypress'

export default defineConfig({
  projectId: 'vpyrho',
  viewportWidth: 1920,
  viewportHeight: 1920,
  defaultCommandTimeout: 60000,
  chromeWebSecurity: false,
  pageLoadTimeout: 2000000,
  env: {
    forceRecord: false,
    cleanMocks: false,
    mocksFolder: null,
    whitelistHeaders: ['content-type'],
    mocksName: 'All Integration Specs',
    includeHosts: [
      'dev-api.ethereum.shapeshift.com',
      'assets.coincap.io',
      'raw.githubusercontent.com',
      'api.0x.org',
      'api.github.com',
      'dev-api.bitcoin.shapeshift.com',
      'dev-api.cosmos.shapeshift.com',
      'static.coincap.io',
      'mainnet.infura.io',
      'raw.githack.com',
      'rawcdn.githack.com',
      'api.coingecko.com',
      'cache.yearn.finance',
    ],
    testPublicKey: '0xfDCa77f9dBBc6D29970E9E0b0Ef5e5Bc45C8fCde',
    testSeed: 'attract alcohol strike orphan decline flush option goat path offer sense know',
    testPassword: 'tnj7!NNY@#ep',
    walletIndexedDbName: 'c8e4859b-a0ca-5da8-b29a-05007e09151f',
    '0xApi': 'https://api.0x.org/',
    coinGeckoApi: 'https://api.coingecko.com/api/v3/',
    foxContract: 'eip155:1/erc20:0xc770eefad204b5180df6a14ee197d99d808ee52d',
    linkContract: 'eip155:1/erc20:0x514910771af9ca656af840dff83e8264ecf986ca',
  },
  e2e: {
    setupNodeEvents(on, config) {
      return require('./cypress/plugins/index.ts')(on, config)
    },
    baseUrl: 'http://localhost:3000/#/',
    specPattern: 'cypress/e2e/**/*.{js,jsx,ts,tsx}',
    experimentalStudio: true,
  },
})
