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

import * as abstract from './abstract'
import * as aptos from './aptos'
import * as arbitrum from './arbitrum'
import * as avalanche from './avalanche'
import * as base from './base'
import * as berachain from './berachain'
import * as blast from './blast'
import * as bnbsmartchain from './bnbsmartchain'
import * as bob from './bob'
import * as celo from './celo'
import * as cronos from './cronos'
import * as ethereal from './ethereal'
import * as ethereum from './ethereum'
import * as flowEvm from './flowEvm'
import * as gnosis from './gnosis'
import * as hemi from './hemi'
import * as hyperevm from './hyperevm'
import * as ink from './ink'
import * as katana from './katana'
import * as linea from './linea'
import * as mantle from './mantle'
import * as megaeth from './megaeth'
import * as mode from './mode'
import * as monad from './monad'
import * as near from './near'
import * as optimism from './optimism'
import * as plasma from './plasma'
import * as plume from './plume'
import * as polygon from './polygon'
import * as robinhood from './robinhood'
import * as scroll from './scroll'
import * as sei from './sei'
import * as solana from './solana'
import * as soneium from './soneium'
import * as sonic from './sonic'
import * as starknet from './starknet'
import * as story from './story'
import * as sui from './sui'
import * as tonModule from './ton'
import * as tronModule from './tron'
import * as unichain from './unichain'
import * as worldchainModule from './worldchain'
import * as zksyncera from './zksyncera'

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
  const etherealAssets = await ethereal.getAssets()
  const flowEvmAssets = await flowEvm.getAssets()
  const celoAssets = await celo.getAssets()
  const zksyncEraAssets = await zksyncera.getAssets()
  const blastAssets = await blast.getAssets()
  const abstractAssets = await abstract.getAssets()
  const hemiAssets = await hemi.getAssets()
  const mantleAssets = await mantle.getAssets()
  const inkAssets = await ink.getAssets()
  const lineaAssets = await linea.getAssets()
  const cronosAssets = await cronos.getAssets()
  const unichainAssets = await unichain.getAssets()
  const bobAssets = await bob.getAssets()
  const megaethAssets = await megaeth.getAssets()
  const berachainAssets = await berachain.getAssets()
  const scrollAssets = await scroll.getAssets()
  const modeAssets = await mode.getAssets()
  const plasmaAssets = await plasma.getAssets()
  const plumeAssets = await plume.getAssets()
  const storyAssets = await story.getAssets()
  const worldchainAssets = await worldchainModule.getAssets()
  const sonicAssets = await sonic.getAssets()
  const soneiumAssets = await soneium.getAssets()
  const seiAssets = await sei.getAssets()
  const solanaAssets = await solana.getAssets()
  const starknetAssets = await starknet.getAssets()
  const tronAssets = await tronModule.getAssets()
  const suiAssets = await sui.getAssets()
  const tonAssets = await tonModule.getAssets()
  const nearAssets = await near.getAssets()
  const robinhoodAssets = await robinhood.getAssets()
  const aptosAssets = await aptos.getAssets()

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
    ...etherealAssets,
    ...flowEvmAssets,
    ...celoAssets,
    ...zksyncEraAssets,
    ...blastAssets,
    ...abstractAssets,
    ...hemiAssets,
    ...mantleAssets,
    ...inkAssets,
    ...lineaAssets,
    ...cronosAssets,
    ...unichainAssets,
    ...bobAssets,
    ...megaethAssets,
    ...berachainAssets,
    ...scrollAssets,
    ...modeAssets,
    ...plasmaAssets,
    ...plumeAssets,
    ...storyAssets,
    ...worldchainAssets,
    ...sonicAssets,
    ...soneiumAssets,
    ...seiAssets,
    ...solanaAssets,
    ...starknetAssets,
    ...tronAssets,
    ...suiAssets,
    ...tonAssets,
    ...nearAssets,
    ...robinhoodAssets,
    ...aptosAssets,
  ]
}
