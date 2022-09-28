import { ethereum } from '@shapeshiftoss/chain-adapters'
import { HDWallet } from '@shapeshiftoss/hdwallet-core'
import { KnownChainIds } from '@shapeshiftoss/types'
import Web3 from 'web3'

import { SwapperType, TradeResult } from '../../api'
import { BTC, ETH, FOX, WBTC, WETH } from '../utils/test-data/assets'
import { setupBuildTrade, setupQuote } from '../utils/test-data/setupSwapQuote'
import { cowApprovalNeeded } from './cowApprovalNeeded/cowApprovalNeeded'
import { cowApproveAmount, cowApproveInfinite } from './cowApprove/cowApprove'
import { cowBuildTrade } from './cowBuildTrade/cowBuildTrade'
import { cowExecuteTrade } from './cowExecuteTrade/cowExecuteTrade'
import { cowGetTradeTxs } from './cowGetTradeTxs/cowGetTradeTxs'
import { CowSwapper, CowSwapperDeps } from './CowSwapper'
import { getCowSwapTradeQuote } from './getCowSwapTradeQuote/getCowSwapTradeQuote'
import { CowTrade } from './types'
import { getUsdRate } from './utils/helpers/helpers'

jest.mock('./utils/helpers/helpers')

jest.mock('./cowApprovalNeeded/cowApprovalNeeded', () => ({
  cowApprovalNeeded: jest.fn(),
}))

jest.mock('./cowApprove/cowApprove', () => ({
  cowApproveInfinite: jest.fn(),
  cowApproveAmount: jest.fn(),
}))

const COW_SWAPPER_DEPS: CowSwapperDeps = {
  apiUrl: 'https://api.cow.fi/mainnet/api/',
  adapter: {} as ethereum.ChainAdapter,
  web3: {} as Web3,
}

jest.mock('./getCowSwapTradeQuote/getCowSwapTradeQuote', () => ({
  getCowSwapTradeQuote: jest.fn(),
}))

jest.mock('./cowBuildTrade/cowBuildTrade', () => ({
  cowBuildTrade: jest.fn(),
}))

jest.mock('./cowExecuteTrade/cowExecuteTrade', () => ({
  cowExecuteTrade: jest.fn(),
}))

jest.mock('./cowGetTradeTxs/cowGetTradeTxs', () => ({
  cowGetTradeTxs: jest.fn(),
}))

const ASSET_IDS = [ETH.assetId, WBTC.assetId, WETH.assetId, BTC.assetId, FOX.assetId]

describe('CowSwapper', () => {
  const wallet = <HDWallet>{}
  const swapper = new CowSwapper(COW_SWAPPER_DEPS)

  describe('name', () => {
    it('returns the correct human readable swapper name', () => {
      expect(swapper.name).toEqual('CowSwap')
    })
  })

  describe('getType', () => {
    it('returns the correct type for CowSwapper', async () => {
      await expect(swapper.getType()).toEqual(SwapperType.CowSwap)
    })
  })

  describe('getUsdRate', () => {
    it('calls getUsdRate on swapper.getUsdRate', async () => {
      await swapper.getUsdRate(FOX)
      expect(getUsdRate).toHaveBeenCalledWith(COW_SWAPPER_DEPS, FOX)
    })
  })

  describe('filterAssetIdsBySellable', () => {
    it('returns empty array when called with an empty array', () => {
      expect(swapper.filterAssetIdsBySellable([])).toEqual([])
    })

    it('returns array filtered out of non erc20 tokens', () => {
      expect(swapper.filterAssetIdsBySellable(ASSET_IDS)).toEqual([
        WBTC.assetId,
        WETH.assetId,
        FOX.assetId,
      ])
    })

    it('returns array filtered out of unsupported tokens', () => {
      const assetIds = [FOX.assetId, 'eip155:1/erc20:0xdc49108ce5c57bc3408c3a5e95f3d864ec386ed3']
      expect(swapper.filterAssetIdsBySellable(assetIds)).toEqual([FOX.assetId])
    })
  })

  describe('filterBuyAssetsBySellAssetId', () => {
    it('returns empty array when called with an empty assetIds array', () => {
      expect(
        swapper.filterBuyAssetsBySellAssetId({ assetIds: [], sellAssetId: WETH.assetId }),
      ).toEqual([])
    })

    it('returns empty array when called with sellAssetId that is not sellable', () => {
      expect(
        swapper.filterBuyAssetsBySellAssetId({
          assetIds: ASSET_IDS,
          sellAssetId: ETH.assetId,
        }),
      ).toEqual([])
      expect(
        swapper.filterBuyAssetsBySellAssetId({
          assetIds: ASSET_IDS,
          sellAssetId: 'eip155:1/erc20:0xdc49108ce5c57bc3408c3a5e95f3d864ec386ed3',
        }),
      ).toEqual([])
    })

    it('returns array filtered out of non erc20 tokens when called with a sellable sellAssetId', () => {
      expect(
        swapper.filterBuyAssetsBySellAssetId({
          assetIds: ASSET_IDS,
          sellAssetId: WETH.assetId,
        }),
      ).toEqual([ETH.assetId, WBTC.assetId, FOX.assetId])
      expect(
        swapper.filterBuyAssetsBySellAssetId({
          assetIds: ASSET_IDS,
          sellAssetId: WBTC.assetId,
        }),
      ).toEqual([ETH.assetId, WETH.assetId, FOX.assetId])
      expect(
        swapper.filterBuyAssetsBySellAssetId({
          assetIds: ASSET_IDS,
          sellAssetId: FOX.assetId,
        }),
      ).toEqual([ETH.assetId, WBTC.assetId, WETH.assetId])
    })

    it('returns array filtered out of unsupported tokens when called with a sellable sellAssetId', () => {
      const assetIds = [FOX.assetId, 'eip155:1/erc20:0xdc49108ce5c57bc3408c3a5e95f3d864ec386ed3']
      expect(
        swapper.filterBuyAssetsBySellAssetId({
          assetIds,
          sellAssetId: WETH.assetId,
        }),
      ).toEqual([FOX.assetId])
      expect(swapper.filterBuyAssetsBySellAssetId({ assetIds, sellAssetId: FOX.assetId })).toEqual(
        [],
      )
    })
  })

  describe('getTradeQuote', () => {
    it('calls getCowSwapTradeQuote on swapper.getTradeQuote', async () => {
      const { quoteInput } = setupQuote()
      await swapper.getTradeQuote(quoteInput)
      expect(getCowSwapTradeQuote).toHaveBeenCalledTimes(1)
      expect(getCowSwapTradeQuote).toHaveBeenCalledWith(COW_SWAPPER_DEPS, quoteInput)
    })
  })

  describe('buildTrade', () => {
    it('calls cowBuildTrade on swapper.buildTrade', async () => {
      const { buildTradeInput } = setupBuildTrade()
      const args = { ...buildTradeInput, wallet }
      await swapper.buildTrade(args)
      expect(cowBuildTrade).toHaveBeenCalledTimes(1)
      expect(cowBuildTrade).toHaveBeenCalledWith(COW_SWAPPER_DEPS, args)
    })
  })

  describe('cowApprovalNeeded', () => {
    it('calls cowApprovalNeeded on swapper.approvalNeeded', async () => {
      const { tradeQuote } = setupQuote()
      const args = { quote: tradeQuote, wallet }
      await swapper.approvalNeeded(args)
      expect(cowApprovalNeeded).toHaveBeenCalledTimes(1)
      expect(cowApprovalNeeded).toHaveBeenCalledWith(COW_SWAPPER_DEPS, args)
    })
  })

  describe('cowApproveInfinite', () => {
    it('calls cowApproveInfinite on swapper.approveInfinite', async () => {
      const { tradeQuote } = setupQuote()
      const args = { quote: tradeQuote, wallet }
      await swapper.approveInfinite(args)
      expect(cowApproveInfinite).toHaveBeenCalledTimes(1)
      expect(cowApproveInfinite).toHaveBeenCalledWith(COW_SWAPPER_DEPS, args)
    })
  })

  describe('cowApproveAmount', () => {
    it('calls cowApproveAmount on swapper.approveAmount', async () => {
      const { tradeQuote } = setupQuote()
      const args = { quote: tradeQuote, wallet, amount: '500' }
      await swapper.approveAmount(args)
      expect(cowApproveAmount).toHaveBeenCalledTimes(1)
      expect(cowApproveAmount).toHaveBeenCalledWith(COW_SWAPPER_DEPS, args)
    })
  })

  describe('executeTrade', () => {
    it('calls executeTrade on swapper.buildTrade', async () => {
      const cowSwapTrade: CowTrade<KnownChainIds.EthereumMainnet> = {
        sellAmount: '1000000000000000000',
        buyAmount: '14501811818247595090576',
        sources: [{ name: 'CowSwap', proportion: '1' }],
        buyAsset: FOX,
        sellAsset: WETH,
        bip44Params: { purpose: 44, coinType: 60, accountNumber: 0 },
        receiveAddress: 'address11',
        feeAmountInSellToken: '14557942658757988',
        rate: '14716.04718939437505555958',
        feeData: {
          fee: '14557942658757988',
          chainSpecific: {
            estimatedGas: '100000',
            gasPrice: '79036500000',
          },
          tradeFee: '0',
          buyAssetTradeFeeUsd: '0',
          sellAssetTradeFeeUsd: '0',
          networkFee: '14557942658757988',
        },
        sellAmountWithoutFee: '985442057341242012',
      }
      const args = { trade: cowSwapTrade, wallet }
      await swapper.executeTrade(args)
      expect(cowExecuteTrade).toHaveBeenCalledTimes(1)
      expect(cowExecuteTrade).toHaveBeenCalledWith(COW_SWAPPER_DEPS, args)
    })
  })

  describe('getTradeTxs', () => {
    it('calls cowGetTradeTxs on swapper.getTradeTxs', async () => {
      const args: TradeResult = {
        tradeId: 'tradeId789456',
      }
      await swapper.getTradeTxs(args)
      expect(cowGetTradeTxs).toHaveBeenCalledTimes(1)
      expect(cowGetTradeTxs).toHaveBeenCalledWith(COW_SWAPPER_DEPS, args)
    })
  })
})
