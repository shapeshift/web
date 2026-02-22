import axios from 'axios'
import fs from 'fs'

import type { AssetId } from '../../assetId/assetId'
import { toAssetId } from '../../assetId/assetId'
import type { ChainId } from '../../chainId/chainId'
import {
  arbitrumAssetId,
  arbitrumChainId,
  ASSET_NAMESPACE,
  avalancheAssetId,
  avalancheChainId,
  baseAssetId,
  baseChainId,
  bchChainId,
  berachainAssetId,
  berachainChainId,
  blastAssetId,
  blastChainId,
  bobAssetId,
  bobChainId,
  bscAssetId,
  bscChainId,
  btcChainId,
  CHAIN_NAMESPACE,
  CHAIN_REFERENCE,
  cosmosChainId,
  cronosAssetId,
  cronosChainId,
  dogeChainId,
  ethAssetId,
  ethChainId,
  gnosisAssetId,
  gnosisChainId,
  hemiAssetId,
  hemiChainId,
  hyperEvmAssetId,
  hyperEvmChainId,
  inkAssetId,
  inkChainId,
  katanaAssetId,
  katanaChainId,
  lineaAssetId,
  lineaChainId,
  ltcChainId,
  mantleAssetId,
  mantleChainId,
  mayachainChainId,
  megaethAssetId,
  megaethChainId,
  modeAssetId,
  modeChainId,
  monadAssetId,
  monadChainId,
  nearAssetId,
  nearChainId,
  optimismAssetId,
  optimismChainId,
  plasmaAssetId,
  plasmaChainId,
  polygonAssetId,
  polygonChainId,
  scrollAssetId,
  scrollChainId,
  solanaChainId,
  solAssetId,
  soneiumAssetId,
  soneiumChainId,
  sonicAssetId,
  sonicChainId,
  starknetAssetId,
  starknetChainId,
  suiAssetId,
  suiChainId,
  thorchainChainId,
  tonAssetId,
  tonChainId,
  tronAssetId,
  tronChainId,
  unichainAssetId,
  unichainChainId,
  worldChainAssetId,
  worldChainChainId,
  zecChainId,
} from '../../constants'
import {
  bitcoinAssetMap,
  bitcoinCashAssetMap,
  cosmosAssetMap,
  dogecoinAssetMap,
  litecoinAssetMap,
  mayachainAssetMap,
  thorchainAssetMap,
  zcashAssetMap,
} from '../../utils'
import { CoingeckoAssetPlatform } from '.'

export type CoingeckoCoin = {
  id: string
  platforms: Record<string, string>
}

type AssetMap = Record<ChainId, Record<AssetId, string>>

export const fetchData = async (URL: string) => (await axios.get<CoingeckoCoin[]>(URL)).data

export const parseData = (coins: CoingeckoCoin[]): AssetMap => {
  const assetMap = coins.reduce<AssetMap>(
    (prev, { id, platforms }) => {
      if (Object.keys(platforms).includes(CoingeckoAssetPlatform.Ethereum)) {
        try {
          const assetId = toAssetId({
            chainNamespace: CHAIN_NAMESPACE.Evm,
            chainReference: CHAIN_REFERENCE.EthereumMainnet,
            assetNamespace: 'erc20',
            assetReference: platforms[CoingeckoAssetPlatform.Ethereum],
          })
          prev[ethChainId][assetId] = id
        } catch {
          // unable to create assetId, skip token
        }
      }

      if (Object.keys(platforms).includes(CoingeckoAssetPlatform.Avalanche)) {
        try {
          const assetId = toAssetId({
            chainNamespace: CHAIN_NAMESPACE.Evm,
            chainReference: CHAIN_REFERENCE.AvalancheCChain,
            assetNamespace: 'erc20',
            assetReference: platforms[CoingeckoAssetPlatform.Avalanche],
          })
          prev[avalancheChainId][assetId] = id
        } catch {
          // unable to create assetId, skip token
        }
      }

      if (Object.keys(platforms).includes(CoingeckoAssetPlatform.Optimism)) {
        try {
          const assetId = toAssetId({
            chainNamespace: CHAIN_NAMESPACE.Evm,
            chainReference: CHAIN_REFERENCE.OptimismMainnet,
            assetNamespace: 'erc20',
            assetReference: platforms[CoingeckoAssetPlatform.Optimism],
          })
          prev[optimismChainId][assetId] = id
        } catch {
          // unable to create assetId, skip token
        }
      }

      if (Object.keys(platforms).includes(CoingeckoAssetPlatform.BnbSmartChain)) {
        try {
          const assetId = toAssetId({
            chainNamespace: CHAIN_NAMESPACE.Evm,
            chainReference: CHAIN_REFERENCE.BnbSmartChainMainnet,
            assetNamespace: 'erc20',
            assetReference: platforms[CoingeckoAssetPlatform.BnbSmartChain],
          })
          prev[bscChainId][assetId] = id
        } catch {
          // unable to create assetId, skip token
        }
      }

      if (Object.keys(platforms).includes(CoingeckoAssetPlatform.Polygon)) {
        try {
          const assetId = toAssetId({
            chainNamespace: CHAIN_NAMESPACE.Evm,
            chainReference: CHAIN_REFERENCE.PolygonMainnet,
            assetNamespace: 'erc20',
            assetReference: platforms[CoingeckoAssetPlatform.Polygon],
          })
          prev[polygonChainId][assetId] = id
        } catch (err) {
          // unable to create assetId, skip token
        }
      }

      if (Object.keys(platforms).includes(CoingeckoAssetPlatform.Gnosis)) {
        try {
          const assetId = toAssetId({
            chainNamespace: CHAIN_NAMESPACE.Evm,
            chainReference: CHAIN_REFERENCE.GnosisMainnet,
            assetNamespace: 'erc20',
            assetReference: platforms[CoingeckoAssetPlatform.Gnosis],
          })
          prev[gnosisChainId][assetId] = id
        } catch (err) {
          // unable to create assetId, skip token
        }
      }

      if (Object.keys(platforms).includes(CoingeckoAssetPlatform.Arbitrum)) {
        try {
          const assetId = toAssetId({
            chainNamespace: CHAIN_NAMESPACE.Evm,
            chainReference: CHAIN_REFERENCE.ArbitrumMainnet,
            assetNamespace: 'erc20',
            assetReference: platforms[CoingeckoAssetPlatform.Arbitrum],
          })
          prev[arbitrumChainId][assetId] = id
        } catch (err) {
          // unable to create assetId, skip token
        }
      }

      if (Object.keys(platforms).includes(CoingeckoAssetPlatform.Base)) {
        try {
          const assetId = toAssetId({
            chainNamespace: CHAIN_NAMESPACE.Evm,
            chainReference: CHAIN_REFERENCE.BaseMainnet,
            assetNamespace: 'erc20',
            assetReference: platforms[CoingeckoAssetPlatform.Base],
          })
          prev[baseChainId][assetId] = id
        } catch {
          // unable to create assetId, skip token
        }
      }

      if (Object.keys(platforms).includes(CoingeckoAssetPlatform.HyperEvm)) {
        try {
          const assetId = toAssetId({
            chainNamespace: CHAIN_NAMESPACE.Evm,
            chainReference: CHAIN_REFERENCE.HyperEvmMainnet,
            assetNamespace: 'erc20',
            assetReference: platforms[CoingeckoAssetPlatform.HyperEvm],
          })
          prev[hyperEvmChainId][assetId] = id
        } catch {
          // unable to create assetId, skip token
        }
      }

      if (Object.keys(platforms).includes(CoingeckoAssetPlatform.Solana)) {
        try {
          const assetId = toAssetId({
            chainNamespace: CHAIN_NAMESPACE.Solana,
            chainReference: CHAIN_REFERENCE.SolanaMainnet,
            assetNamespace: 'token',
            assetReference: platforms[CoingeckoAssetPlatform.Solana],
          })
          prev[solanaChainId][assetId] = id
        } catch {
          // unable to create assetId, skip token
        }
      }

      if (Object.keys(platforms).includes(CoingeckoAssetPlatform.Tron)) {
        try {
          const assetId = toAssetId({
            chainNamespace: CHAIN_NAMESPACE.Tron,
            chainReference: CHAIN_REFERENCE.TronMainnet,
            assetNamespace: 'trc20',
            assetReference: platforms[CoingeckoAssetPlatform.Tron],
          })
          prev[tronChainId][assetId] = id
        } catch {
          // unable to create assetId, skip token
        }
      }

      if (Object.keys(platforms).includes(CoingeckoAssetPlatform.Sui)) {
        try {
          const assetId = toAssetId({
            chainNamespace: CHAIN_NAMESPACE.Sui,
            chainReference: CHAIN_REFERENCE.SuiMainnet,
            assetNamespace: ASSET_NAMESPACE.suiCoin,
            assetReference: platforms[CoingeckoAssetPlatform.Sui],
          })
          prev[suiChainId][assetId] = id
        } catch {
          // unable to create assetId, skip token
        }
      }

      if (Object.keys(platforms).includes(CoingeckoAssetPlatform.Monad)) {
        try {
          const assetId = toAssetId({
            chainNamespace: CHAIN_NAMESPACE.Evm,
            chainReference: CHAIN_REFERENCE.MonadMainnet,
            assetNamespace: 'erc20',
            assetReference: platforms[CoingeckoAssetPlatform.Monad],
          })
          prev[monadChainId][assetId] = id
        } catch {
          // unable to create assetId, skip token
        }
      }

      if (Object.keys(platforms).includes(CoingeckoAssetPlatform.Plasma)) {
        try {
          const assetId = toAssetId({
            chainNamespace: CHAIN_NAMESPACE.Evm,
            chainReference: CHAIN_REFERENCE.PlasmaMainnet,
            assetNamespace: 'erc20',
            assetReference: platforms[CoingeckoAssetPlatform.Plasma],
          })
          prev[plasmaChainId][assetId] = id
        } catch {
          // unable to create assetId, skip token
        }
      }

      if (Object.keys(platforms).includes(CoingeckoAssetPlatform.WorldChain)) {
        try {
          const assetId = toAssetId({
            chainNamespace: CHAIN_NAMESPACE.Evm,
            chainReference: CHAIN_REFERENCE.WorldChainMainnet,
            assetNamespace: 'erc20',
            assetReference: platforms[CoingeckoAssetPlatform.WorldChain],
          })
          prev[worldChainChainId][assetId] = id
        } catch {
          // unable to create assetId, skip token
        }
      }

      if (Object.keys(platforms).includes(CoingeckoAssetPlatform.Mantle)) {
        try {
          const assetId = toAssetId({
            chainNamespace: CHAIN_NAMESPACE.Evm,
            chainReference: CHAIN_REFERENCE.MantleMainnet,
            assetNamespace: 'erc20',
            assetReference: platforms[CoingeckoAssetPlatform.Mantle],
          })
          prev[mantleChainId][assetId] = id
        } catch {
          // unable to create assetId, skip token
        }
      }

      if (Object.keys(platforms).includes(CoingeckoAssetPlatform.Ink)) {
        try {
          const assetId = toAssetId({
            chainNamespace: CHAIN_NAMESPACE.Evm,
            chainReference: CHAIN_REFERENCE.InkMainnet,
            assetNamespace: 'erc20',
            assetReference: platforms[CoingeckoAssetPlatform.Ink],
          })
          prev[inkChainId][assetId] = id
        } catch {
          // unable to create assetId, skip token
        }
      }

      if (Object.keys(platforms).includes(CoingeckoAssetPlatform.MegaEth)) {
        try {
          const assetId = toAssetId({
            chainNamespace: CHAIN_NAMESPACE.Evm,
            chainReference: CHAIN_REFERENCE.MegaEthMainnet,
            assetNamespace: 'erc20',
            assetReference: platforms[CoingeckoAssetPlatform.MegaEth],
          })
          prev[megaethChainId][assetId] = id
        } catch {
          // unable to create assetId, skip token
        }
      }

      if (Object.keys(platforms).includes(CoingeckoAssetPlatform.Linea)) {
        try {
          const assetId = toAssetId({
            chainNamespace: CHAIN_NAMESPACE.Evm,
            chainReference: CHAIN_REFERENCE.LineaMainnet,
            assetNamespace: 'erc20',
            assetReference: platforms[CoingeckoAssetPlatform.Linea],
          })
          prev[lineaChainId][assetId] = id
        } catch {
          // unable to create assetId, skip token
        }
      }

      if (Object.keys(platforms).includes(CoingeckoAssetPlatform.Berachain)) {
        try {
          const assetId = toAssetId({
            chainNamespace: CHAIN_NAMESPACE.Evm,
            chainReference: CHAIN_REFERENCE.BerachainMainnet,
            assetNamespace: 'erc20',
            assetReference: platforms[CoingeckoAssetPlatform.Berachain],
          })
          prev[berachainChainId][assetId] = id
        } catch {
          // unable to create assetId, skip token
        }
      }

      if (Object.keys(platforms).includes(CoingeckoAssetPlatform.Scroll)) {
        try {
          const assetId = toAssetId({
            chainNamespace: CHAIN_NAMESPACE.Evm,
            chainReference: CHAIN_REFERENCE.ScrollMainnet,
            assetNamespace: 'erc20',
            assetReference: platforms[CoingeckoAssetPlatform.Scroll],
          })
          prev[scrollChainId][assetId] = id
        } catch {
          // unable to create assetId, skip token
        }
      }

      if (Object.keys(platforms).includes(CoingeckoAssetPlatform.Cronos)) {
        try {
          const assetId = toAssetId({
            chainNamespace: CHAIN_NAMESPACE.Evm,
            chainReference: CHAIN_REFERENCE.CronosMainnet,
            assetNamespace: 'erc20',
            assetReference: platforms[CoingeckoAssetPlatform.Cronos],
          })
          prev[cronosChainId][assetId] = id
        } catch {
          // unable to create assetId, skip token
        }
      }

      if (Object.keys(platforms).includes(CoingeckoAssetPlatform.Katana)) {
        try {
          const assetId = toAssetId({
            chainNamespace: CHAIN_NAMESPACE.Evm,
            chainReference: CHAIN_REFERENCE.KatanaMainnet,
            assetNamespace: 'erc20',
            assetReference: platforms[CoingeckoAssetPlatform.Katana],
          })
          prev[katanaChainId][assetId] = id
        } catch {
          // unable to create assetId, skip token
        }
      }

      if (Object.keys(platforms).includes(CoingeckoAssetPlatform.Blast)) {
        try {
          const assetId = toAssetId({
            chainNamespace: CHAIN_NAMESPACE.Evm,
            chainReference: CHAIN_REFERENCE.BlastMainnet,
            assetNamespace: 'erc20',
            assetReference: platforms[CoingeckoAssetPlatform.Blast],
          })
          prev[blastChainId][assetId] = id
        } catch {
          // unable to create assetId, skip token
        }
      }

      if (Object.keys(platforms).includes(CoingeckoAssetPlatform.Hemi)) {
        try {
          const assetId = toAssetId({
            chainNamespace: CHAIN_NAMESPACE.Evm,
            chainReference: CHAIN_REFERENCE.HemiMainnet,
            assetNamespace: 'erc20',
            assetReference: platforms[CoingeckoAssetPlatform.Hemi],
          })
          prev[hemiChainId][assetId] = id
        } catch {
          // unable to create assetId, skip token
        }
      }

      if (Object.keys(platforms).includes(CoingeckoAssetPlatform.Sonic)) {
        try {
          const assetId = toAssetId({
            chainNamespace: CHAIN_NAMESPACE.Evm,
            chainReference: CHAIN_REFERENCE.SonicMainnet,
            assetNamespace: 'erc20',
            assetReference: platforms[CoingeckoAssetPlatform.Sonic],
          })
          prev[sonicChainId][assetId] = id
        } catch {
          // unable to create assetId, skip token
        }
      }

      if (Object.keys(platforms).includes(CoingeckoAssetPlatform.Unichain)) {
        try {
          const assetId = toAssetId({
            chainNamespace: CHAIN_NAMESPACE.Evm,
            chainReference: CHAIN_REFERENCE.UnichainMainnet,
            assetNamespace: 'erc20',
            assetReference: platforms[CoingeckoAssetPlatform.Unichain],
          })
          prev[unichainChainId][assetId] = id
        } catch {
          // unable to create assetId, skip token
        }
      }

      if (Object.keys(platforms).includes(CoingeckoAssetPlatform.Bob)) {
        try {
          const assetId = toAssetId({
            chainNamespace: CHAIN_NAMESPACE.Evm,
            chainReference: CHAIN_REFERENCE.BobMainnet,
            assetNamespace: 'erc20',
            assetReference: platforms[CoingeckoAssetPlatform.Bob],
          })
          prev[bobChainId][assetId] = id
        } catch {
          // unable to create assetId, skip token
        }
      }

      if (Object.keys(platforms).includes(CoingeckoAssetPlatform.Mode)) {
        try {
          const assetId = toAssetId({
            chainNamespace: CHAIN_NAMESPACE.Evm,
            chainReference: CHAIN_REFERENCE.ModeMainnet,
            assetNamespace: 'erc20',
            assetReference: platforms[CoingeckoAssetPlatform.Mode],
          })
          prev[modeChainId][assetId] = id
        } catch {
          // unable to create assetId, skip token
        }
      }

      if (Object.keys(platforms).includes(CoingeckoAssetPlatform.Soneium)) {
        try {
          const assetId = toAssetId({
            chainNamespace: CHAIN_NAMESPACE.Evm,
            chainReference: CHAIN_REFERENCE.SoneiumMainnet,
            assetNamespace: 'erc20',
            assetReference: platforms[CoingeckoAssetPlatform.Soneium],
          })
          prev[soneiumChainId][assetId] = id
        } catch {
          // unable to create assetId, skip token
        }
      }

      if (Object.keys(platforms).includes(CoingeckoAssetPlatform.Starknet)) {
        try {
          const assetId = toAssetId({
            chainNamespace: CHAIN_NAMESPACE.Starknet,
            chainReference: CHAIN_REFERENCE.StarknetMainnet,
            assetNamespace: ASSET_NAMESPACE.starknetToken,
            assetReference: platforms[CoingeckoAssetPlatform.Starknet],
          })
          prev[starknetChainId][assetId] = id
        } catch {
          // unable to create assetId, skip token
        }
      }

      if (Object.keys(platforms).includes(CoingeckoAssetPlatform.Near)) {
        try {
          const assetId = toAssetId({
            chainNamespace: CHAIN_NAMESPACE.Near,
            chainReference: CHAIN_REFERENCE.NearMainnet,
            assetNamespace: ASSET_NAMESPACE.nep141,
            assetReference: platforms[CoingeckoAssetPlatform.Near],
          })
          prev[nearChainId][assetId] = id
        } catch {
          // unable to create assetId, skip token
        }
      }

      if (Object.keys(platforms).includes(CoingeckoAssetPlatform.Ton)) {
        try {
          const assetId = toAssetId({
            chainNamespace: CHAIN_NAMESPACE.Ton,
            chainReference: CHAIN_REFERENCE.TonMainnet,
            assetNamespace: ASSET_NAMESPACE.jetton,
            assetReference: platforms[CoingeckoAssetPlatform.Ton],
          })
          prev[tonChainId][assetId] = id
        } catch {
          // unable to create assetId, skip token
        }
      }

      return prev
    },
    {
      [ethChainId]: { [ethAssetId]: 'ethereum' },
      [avalancheChainId]: { [avalancheAssetId]: 'avalanche-2' },
      [optimismChainId]: { [optimismAssetId]: 'ethereum' },
      [bscChainId]: { [bscAssetId]: 'binancecoin' },
      [polygonChainId]: { [polygonAssetId]: 'polygon-ecosystem-token' },
      [gnosisChainId]: { [gnosisAssetId]: 'xdai' },
      [arbitrumChainId]: { [arbitrumAssetId]: 'ethereum' },
      [baseChainId]: { [baseAssetId]: 'ethereum' },
      [hyperEvmChainId]: { [hyperEvmAssetId]: 'hyperliquid' },
      [monadChainId]: { [monadAssetId]: 'monad' },
      [plasmaChainId]: { [plasmaAssetId]: 'plasma' },
      [mantleChainId]: { [mantleAssetId]: 'mantle' },
      [inkChainId]: { [inkAssetId]: 'ethereum' },
      [megaethChainId]: { [megaethAssetId]: 'ethereum' },
      [lineaChainId]: { [lineaAssetId]: 'ethereum' },
      [berachainChainId]: { [berachainAssetId]: 'berachain-bera' },
      [cronosChainId]: { [cronosAssetId]: 'crypto-com-chain' },
      [katanaChainId]: { [katanaAssetId]: 'katana' },
      [blastChainId]: { [blastAssetId]: 'ethereum' },
      [worldChainChainId]: { [worldChainAssetId]: 'ethereum' },
      [hemiChainId]: { [hemiAssetId]: 'ethereum' },
      [scrollChainId]: { [scrollAssetId]: 'ethereum' },
      [sonicChainId]: { [sonicAssetId]: 'sonic-3' },
      [unichainChainId]: { [unichainAssetId]: 'ethereum' },
      [bobChainId]: { [bobAssetId]: 'ethereum' },
      [modeChainId]: { [modeAssetId]: 'ethereum' },
      [soneiumChainId]: { [soneiumAssetId]: 'ethereum' },
      [solanaChainId]: { [solAssetId]: 'solana' },
      [starknetChainId]: { [starknetAssetId]: 'starknet' },
      [tronChainId]: { [tronAssetId]: 'tron' },
      [suiChainId]: { [suiAssetId]: 'sui' },
      [nearChainId]: { [nearAssetId]: 'near' },
      [tonChainId]: { [tonAssetId]: 'the-open-network' },
    },
  )

  return {
    ...assetMap,
    [btcChainId]: bitcoinAssetMap,
    [bchChainId]: bitcoinCashAssetMap,
    [dogeChainId]: dogecoinAssetMap,
    [ltcChainId]: litecoinAssetMap,
    [zecChainId]: zcashAssetMap,
    [cosmosChainId]: cosmosAssetMap,
    [thorchainChainId]: thorchainAssetMap,
    [mayachainChainId]: mayachainAssetMap,
  }
}

export const writeFiles = async (data: AssetMap) => {
  await Promise.all(
    Object.entries(data).map(async ([chainId, assets]) => {
      const dirPath = `./src/adapters/coingecko/generated/${chainId}`.replace(':', '_')
      await fs.promises.mkdir(dirPath, { recursive: true })
      await fs.promises.writeFile(`${dirPath}/adapter.json`, JSON.stringify(assets))
    }),
  )
  console.info('Generated CoinGecko AssetId adapter data.')
}
