import type { Vault } from '@yfi/sdk'
import realFs from 'fs'
import toLower from 'lodash/toLower'

import { parseEthData, writeFiles } from './utils'

jest.mock('@yfi/sdk')

const vault1: Vault = {
  address: '0x6FAfCA7f49B4Fd9dC38117469cd31A1E5aec91F5',
  typeId: 'VAULT_V2',
  token: '0x5B3b5DF2BF2B6543f78e053bD91C4Bdd820929f1',
  name: 'Curve USDM Pool yVault',
  version: '0.4.3',
  symbol: 'yvCurve-USDM',
  decimals: '18',
  tokenId: '0x5B3b5DF2BF2B6543f78e053bD91C4Bdd820929f1',
  underlyingTokenBalance: {
    amount: '1030180223839058491274',
    amountUsdc: '1054861281',
  },
  metadata: {
    symbol: 'yvCurve-USDM',
    controller: '0x0000000000000000000000000000000000000000',
    totalAssets: '0',
    totalSupply: '0',
    pricePerShare: '2590767903793807548',
    migrationAvailable: false,
    latestVaultAddress: '0x6FAfCA7f49B4Fd9dC38117469cd31A1E5aec91F5',
    depositLimit: '0',
    emergencyShutdown: false,
    apy: {
      type: 'n/a',
      gross_apr: 0.00022060103277588006,
      net_apy: 0,
      fees: {
        performance: 0.2,
        withdrawal: null,
        management: 0.02,
        keep_crv: 0.1,
        cvx_keep_crv: 0.1,
      },
      points: null,
      composite: {
        boost: 2.5,
        pool_apy: 0.00022060103277588006,
        boosted_apr: 2.0610936247140685,
        base_apr: 0.8244374498856274,
        cvx_apr: 3.0709986361156054,
        rewards_apr: 0,
      },
    },
    displayIcon:
      'https://raw.githack.com/yearn/yearn-assets/master/icons/multichain-tokens/1/0x5B3b5DF2BF2B6543f78e053bD91C4Bdd820929f1/logo-128.png',
    displayName: 'Curve USDM',
    defaultDisplayToken: '0x5B3b5DF2BF2B6543f78e053bD91C4Bdd820929f1',
    depositsDisabled: true,
    withdrawalsDisabled: false,
    allowZapIn: true,
    allowZapOut: true,
    hideIfNoDeposits: true,
    historicEarnings: [],
  },
}
const vault2: Vault = {
  address: '0x19D3364A399d251E894aC732651be8B0E4e85001',
  typeId: 'VAULT_V2',
  token: '0x6B175474E89094C44Da98b954EedeAC495271d0F',
  name: 'DAI yVault',
  version: '0.3.0',
  symbol: 'yvDAI',
  decimals: '18',
  tokenId: '0x6B175474E89094C44Da98b954EedeAC495271d0F',
  underlyingTokenBalance: {
    amount: '3748145514430272688316652',
    amountUsdc: '3750090801952',
  },
  metadata: {
    symbol: 'yvDAI',
    controller: '0x0000000000000000000000000000000000000000',
    totalAssets: '0',
    totalSupply: '0',
    pricePerShare: '1084750123794815921',
    migrationAvailable: true,
    latestVaultAddress: '0xdA816459F1AB5631232FE5e97a05BBBb94970c95',
    depositLimit: '0',
    emergencyShutdown: false,
    apy: {
      type: 'n/a',
      gross_apr: 0.029109984372077236,
      net_apy: 0.029529435816609828,
      fees: {
        performance: 0,
        withdrawal: null,
        management: 0,
        keep_crv: null,
        cvx_keep_crv: null,
      },
      points: {
        week_ago: 0,
        month_ago: 0.029529435816609828,
        inception: 0.09280211858887322,
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
    historicEarnings: [],
  },
}

const vault3: Vault = {
  address: '0xcB550A6D4C8e3517A939BC79d0c7093eb7cF56B5',
  typeId: 'VAULT_V2',
  token: '0x2260FAC5E5542a773Aa44fBCfeDf7C193bc2C599',
  name: 'WBTC yVault',
  version: '0.3.1',
  symbol: 'yvWBTC',
  decimals: '8',
  tokenId: '0x2260FAC5E5542a773Aa44fBCfeDf7C193bc2C599',
  underlyingTokenBalance: {
    amount: '10858852',
    amountUsdc: '5318743893',
  },
  metadata: {
    symbol: 'yvWBTC',
    controller: '0x0000000000000000000000000000000000000000',
    totalAssets: '0',
    totalSupply: '0',
    pricePerShare: '100298599',
    migrationAvailable: true,
    latestVaultAddress: '0xA696a63cc78DfFa1a63E9E50587C197387FF6C7E',
    depositLimit: '2100000000',
    emergencyShutdown: false,
    apy: {
      type: 'n/a',
      gross_apr: 0.024471143367802532,
      net_apy: 0.004031979987010104,
      fees: {
        performance: 0.1,
        withdrawal: null,
        management: 0.02,
        keep_crv: null,
        cvx_keep_crv: null,
      },
      points: {
        week_ago: 0,
        month_ago: 0,
        inception: 0.004031979987010104,
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
    historicEarnings: [],
  },
}

jest.mock('fs', () => ({
  promises: {
    writeFile: jest.fn(() => undefined),
  },
}))

describe('adapters:yearn:utils', () => {
  describe('yearn: parseEthData', () => {
    it('can parse eth data', () => {
      const result = parseEthData([vault1, vault2, vault3])
      const expected = {
        [`eip155:1/erc20:${toLower(vault1.address)}`]: vault1.address,
        [`eip155:1/erc20:${toLower(vault2.address)}`]: vault2.address,
        [`eip155:1/erc20:${toLower(vault3.address)}`]: vault3.address,
      }
      expect(result).toEqual(expected)
    })
  })

  describe('writeFiles', () => {
    it('can writeFiles', async () => {
      const data = {
        foo: {
          assetIdAbc: 'bitcorn',
          assetIdDef: 'efferium',
        },
      }
      const fooAssetIds = JSON.stringify(data.foo)
      console.info = jest.fn()
      await writeFiles(data)
      expect(realFs.promises.writeFile).toBeCalledWith(
        './src/adapters/yearn/generated/foo/adapter.json',
        fooAssetIds,
      )
      expect(console.info).toBeCalledWith('Generated Yearn AssetId adapter data.')
    })
  })
})
