import type { Asset } from '@shapeshiftoss/types'
import {
  atom,
  bitcoin,
  bitcoincash,
  dogecoin,
  litecoin,
  maya,
  mayachain,
  ruji,
  tcy,
  thorchain,
  unfreeze,
  zcash,
} from '@shapeshiftoss/utils'

import * as aptos from './aptos'
import * as arbitrum from './arbitrum'
import * as avalanche from './avalanche'
import * as base from './base'
import * as bnbsmartchain from './bnbsmartchain'
import * as bob from './bob'
import * as celo from './celo'
import * as cronos from './cronos'
import * as elysium from './elysium'
import * as ethereum from './ethereum'
import * as gnosis from './gnosis'
import * as hyperevm from './hyperevm'
import * as ink from './ink'
import * as katana from './katana'
import * as mantle from './mantle'
import * as megaeth from './megaeth'
import * as monad from './monad'
import * as near from './near'
import * as optimism from './optimism'
import * as plasma from './plasma'
import * as polygon from './polygon'
import * as robinhood from './robinhood'
import * as sei from './sei'
import * as solana from './solana'
import * as sonic from './sonic'
import * as starknet from './starknet'
import * as sui from './sui'
import * as tonModule from './ton'
import * as tronModule from './tron'
import * as unichain from './unichain'

export const getUnfilteredAssetData = async (): Promise<Asset[]> => {
  const ethAssets = await ethereum.getAssets()
  const avalancheAssets = await avalanche.getAssets()
  const optimismAssets = await optimism.getAssets()
  const bnbsmartchainAssets = await bnbsmartchain.getAssets()
  const polygonAssets = await polygon.getAssets()
  const gnosisAssets = await gnosis.getAssets()
  const arbitrumAssets = await arbitrum.getAssets()
  const baseAssets = await base.getAssets()
  const monadAssets = await monad.getAssets()
  const hyperevmAssets = await hyperevm.getAssets()
  const katanaAssets = await katana.getAssets()
  const celoAssets = await celo.getAssets()
  const mantleAssets = await mantle.getAssets()
  const inkAssets = await ink.getAssets()
  const cronosAssets = await cronos.getAssets()
  const unichainAssets = await unichain.getAssets()
  const bobAssets = await bob.getAssets()
  const megaethAssets = await megaeth.getAssets()
  const plasmaAssets = await plasma.getAssets()
  const sonicAssets = await sonic.getAssets()
  const seiAssets = await sei.getAssets()
  const solanaAssets = await solana.getAssets()
  const starknetAssets = await starknet.getAssets()
  const tronAssets = await tronModule.getAssets()
  const suiAssets = await sui.getAssets()
  const tonAssets = await tonModule.getAssets()
  const nearAssets = await near.getAssets()
  const robinhoodAssets = await robinhood.getAssets()
  const aptosAssets = await aptos.getAssets()
  const elysiumAssets = await elysium.getAssets()

  // all assets, included assets to be blacklisted
  return [
    unfreeze(bitcoin),
    unfreeze(bitcoincash),
    unfreeze(dogecoin),
    unfreeze(litecoin),
    unfreeze(zcash),
    unfreeze(atom),
    unfreeze(thorchain),
    unfreeze(tcy),
    unfreeze(ruji),
    unfreeze(mayachain),
    unfreeze(maya),
    ...ethAssets,
    ...avalancheAssets,
    ...optimismAssets,
    ...bnbsmartchainAssets,
    ...polygonAssets,
    ...gnosisAssets,
    ...arbitrumAssets,
    ...baseAssets,
    ...monadAssets,
    ...hyperevmAssets,
    ...katanaAssets,
    ...celoAssets,
    ...mantleAssets,
    ...inkAssets,
    ...cronosAssets,
    ...unichainAssets,
    ...bobAssets,
    ...megaethAssets,
    ...plasmaAssets,
    ...sonicAssets,
    ...seiAssets,
    ...solanaAssets,
    ...starknetAssets,
    ...tronAssets,
    ...suiAssets,
    ...tonAssets,
    ...nearAssets,
    ...robinhoodAssets,
    ...aptosAssets,
    ...elysiumAssets,
  ]
}
