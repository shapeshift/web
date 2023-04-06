import type { Token, Vault } from '@yfi/sdk'

export const mockYearnVaultRestData: Vault[] = [
  {
    address: '0xcB550A6D4C8e3517A939BC79d0c7093eb7cF56B5',
    typeId: 'VAULT_V2',
    token: '0x2260FAC5E5542a773Aa44fBCfeDf7C193bc2C599',
    name: 'WBTC yVault',
    version: '0.3.1',
    symbol: 'yvWBTC',
    decimals: '8',
    tokenId: '0x2260FAC5E5542a773Aa44fBCfeDf7C193bc2C599',
    underlyingTokenBalance: { amount: '10858852', amountUsdc: '5353702158' },
    metadata: {
      controller: '0x0000000000000000000000000000000000000000',
      totalAssets: '0',
      totalSupply: '0',
      symbol: 'yvWBTC',
      pricePerShare: '100298599',
      migrationAvailable: true,
      latestVaultAddress: '0xA696a63cc78DfFa1a63E9E50587C197387FF6C7E',
      depositLimit: '2100000000',
      emergencyShutdown: false,
      apy: {
        type: 'n/a',
        gross_apr: 0.020008669976326006,
        net_apy: 0.00000780300855329763,
        fees: {
          performance: 0.1,
          withdrawal: null,
          management: 0.02,
          keep_crv: null,
          cvx_keep_crv: null,
        },
        points: {
          week_ago: 0.00000780300855329763,
          month_ago: 0.000001793590841403514,
          inception: 0.0040986514460876755,
        },
        composite: null,
      },
      displayIcon:
        'https://raw.githack.com/yearn/yearn-assets/master/icons/multichain-tokens/1/0x2260FAC5E5542a773Aa44fBCfeDf7C193bc2C599/logo-128.png',
      displayName: 'WBTC',
      defaultDisplayToken: '0x2260FAC5E5542a773Aa44fBCfeDf7C193bc2C599',
      depositsDisabled: true,
      withdrawalsDisabled: false,
      allowZapIn: false,
      allowZapOut: true,
      migrationContract: '0x1824df8D751704FA10FA371d62A37f9B8772ab90',
      migrationTargetVault: '0xA696a63cc78DfFa1a63E9E50587C197387FF6C7E',
      hideIfNoDeposits: true,
      historicEarnings: [
        {
          earnings: { amountUsdc: '4568298565', amount: '9265827' },
          date: '2021-11-09T23:59:19.000Z',
        },
        {
          earnings: { amountUsdc: '4568298565', amount: '9265827' },
          date: '2021-11-09T23:59:19.000Z',
        },
        {
          earnings: { amountUsdc: '4568298565', amount: '9265827' },
          date: '2021-11-09T23:59:19.000Z',
        },
        {
          earnings: { amountUsdc: '4568298565', amount: '9265827' },
          date: '2021-11-09T23:59:19.000Z',
        },
        {
          earnings: { amountUsdc: '4568298565', amount: '9265827' },
          date: '2021-11-09T23:59:19.000Z',
        },
        {
          earnings: { amountUsdc: '4568298565', amount: '9265827' },
          date: '2021-11-09T23:59:19.000Z',
        },
        {
          earnings: { amountUsdc: '4568298565', amount: '9265827' },
          date: '2021-11-09T23:59:19.000Z',
        },
        {
          earnings: { amountUsdc: '4568298565', amount: '9265827' },
          date: '2021-11-09T23:59:19.000Z',
        },
        {
          earnings: { amountUsdc: '4568298565', amount: '9265827' },
          date: '2021-11-09T23:59:19.000Z',
        },
        {
          earnings: { amountUsdc: '4568298565', amount: '9265827' },
          date: '2021-11-09T23:59:19.000Z',
        },
        {
          earnings: { amountUsdc: '4568298565', amount: '9265827' },
          date: '2021-11-27T17:34:01.000Z',
        },
        {
          earnings: { amountUsdc: '4568298565', amount: '9265827' },
          date: '2021-11-27T17:34:01.000Z',
        },
        {
          earnings: { amountUsdc: '4368298565', amount: '9235827' },
          date: '2021-11-27T17:34:01.000Z',
        },
        {
          earnings: { amountUsdc: '4568298565', amount: '9265827' },
          date: '2021-11-30T21:11:26.000Z',
        },
      ],
    },
  },
  {
    address: '0x19D3364A399d251E894aC732651be8B0E4e85001',
    typeId: 'VAULT_V2',
    token: '0x6B175474E89094C44Da98b954EedeAC495271d0F',
    name: 'DAI yVault',
    version: '0.3.0',
    symbol: 'yvDAI',
    decimals: '18',
    tokenId: '0x6B175474E89094C44Da98b954EedeAC495271d0F',
    underlyingTokenBalance: {
      amount: '3749544503309184323796587',
      amountUsdc: '3754148943959',
    },
    metadata: {
      controller: '0x0000000000000000000000000000000000000000',
      totalAssets: '0',
      totalSupply: '0',
      pricePerShare: '1084750123794815921',
      symbol: 'yvDAI',
      migrationAvailable: true,
      latestVaultAddress: '0xdA816459F1AB5631232FE5e97a05BBBb94970c95',
      depositLimit: '0',
      emergencyShutdown: false,
      apy: {
        type: 'n/a',
        gross_apr: 0.029072791659551456,
        net_apy: 0.029491166945441627,
        fees: {
          performance: 0,
          withdrawal: null,
          management: 0,
          keep_crv: null,
          cvx_keep_crv: null,
        },
        points: {
          week_ago: 0,
          month_ago: 0.029491166945441627,
          inception: 0.09396663217129686,
        },
        composite: null,
      },
      displayIcon:
        'https://raw.githack.com/yearn/yearn-assets/master/icons/multichain-tokens/1/0x6B175474E89094C44Da98b954EedeAC495271d0F/logo-128.png',
      displayName: 'DAI',
      defaultDisplayToken: '0x6B175474E89094C44Da98b954EedeAC495271d0F',
      depositsDisabled: true,
      withdrawalsDisabled: false,
      allowZapIn: false,
      allowZapOut: true,
      migrationContract: '0x1824df8D751704FA10FA371d62A37f9B8772ab90',
      migrationTargetVault: '0xdA816459F1AB5631232FE5e97a05BBBb94970c95',
      hideIfNoDeposits: true,
      strategies: {
        vaultAddress: '0x19D3364A399d251E894aC732651be8B0E4e85001',
        strategiesMetadata: [
          {
            address: '0x3D6532c589A11117a4494d9725bb8518C731f1Be',
            name: 'Routeryvdai043',
            description: "I don't have a description for this strategy yet",
            protocols: [],
          },
        ],
      },
      historicEarnings: [
        {
          earnings: {
            amountUsdc: '21408471734966',
            amount: '21382214375712138070254065',
          },
          date: '2021-11-17T02:25:49.000Z',
        },
        {
          earnings: {
            amountUsdc: '21408471734966',
            amount: '21382214375712138070254065',
          },
          date: '2021-11-20T07:19:47.000Z',
        },
        {
          earnings: {
            amountUsdc: '21408471734966',
            amount: '21382214375712138070254065',
          },
          date: '2021-11-21T00:51:34.000Z',
        },
        {
          earnings: {
            amountUsdc: '21308471734966',
            amount: '21282214375712138070254065',
          },
          date: '2021-11-21T00:51:34.000Z',
        },
        {
          earnings: {
            amountUsdc: '21408471734966',
            amount: '21382214375712138070254065',
          },
          date: '2021-11-22T10:39:27.000Z',
        },
      ],
    },
  },
]

export const mockYearnGQLData = {
  data: {
    account: {
      vaultPositions: [
        {
          vault: {
            vaultDayData: [
              {
                pricePerShare: '1082124440389265991',
                timestamp: '1639132035000',
                tokenPriceUSDC: '999932',
              },
              {
                pricePerShare: '1082124440389265991',
                timestamp: '1639241453000',
                tokenPriceUSDC: '1000000',
              },
              {
                pricePerShare: '1082124440389265991',
                timestamp: '1639269839000',
                tokenPriceUSDC: '999963',
              },
              {
                pricePerShare: '1084750123794815921',
                timestamp: '1639441831000',
                tokenPriceUSDC: '1000418',
              },
              {
                pricePerShare: '1084750123794815921',
                timestamp: '1639530562000',
                tokenPriceUSDC: '1001033',
              },
            ],
          },
        },
      ],
    },
  },
}

export const mockYearnServiceFindAllData = {
  'eip155:1/erc20:0xdcd90c7f6324cfa40d7169ef80b12031770b4325': {
    price: '4468.08',
    marketCap: '937771950.77',
    volume: '5932398898',
    changePercent24Hr: 2.1380553852e-10,
  },
  'eip155:1/erc20:0xa258c4606ca8206d8aa700ce2143d7db854d168c': {
    price: '4062.35',
    marketCap: '864888828.22',
    volume: '0',
    changePercent24Hr: 0,
  },
  'eip155:1/erc20:0xda816459f1ab5631232fe5e97a05bbbb94970c95': {
    price: '1.02',
    marketCap: '547790387.55',
    volume: '108391293604',
    changePercent24Hr: 7.67881567474e-9,
  },
  'eip155:1/erc20:0x5f18c75abdae578b483e5f43f12a39cf75b973a9': {
    price: '1.09',
    marketCap: '280969149.48',
    volume: '55430827858',
    changePercent24Hr: 1.93301855857e-9,
  },
}

export const mockYearnFindByAssetIdData = {
  price: '1234',
  marketCap: '1564876159',
  volume: '509787461',
  changePercent24Hr: -3.5487,
}

export const mockYearnPriceHistoryData = [
  {
    price: 456789,
    timestamp: 123456,
  },
  {
    price: 556789,
    timestamp: 223456,
  },
  {
    price: 656789,
    timestamp: 323456,
  },
]

export const mockYearnTokenRestData: Token[] = [
  {
    address: '0xcB550A6D4C8e3517A939BC79d0c7093eb7cF56B5',
    name: 'WBTC yVault',
    symbol: 'yvWBTC',
    decimals: '8',
    priceUsdc: '50000000000',
    supported: {},
  },
  {
    address: '0x19D3364A399d251E894aC732651be8B0E4e85001',
    name: 'DAI yVault',
    symbol: 'yvDAI',
    decimals: '18',
    priceUsdc: '990000',
    supported: {},
  },
]
