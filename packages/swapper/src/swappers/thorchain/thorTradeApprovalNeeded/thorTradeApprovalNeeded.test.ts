import { HDWallet } from '@shapeshiftoss/hdwallet-core'
import { KnownChainIds } from '@shapeshiftoss/types'

import { ApprovalNeededInput } from '../../../api'
import { getERC20Allowance } from '../../utils/helpers/helpers'
import { setupQuote } from '../../utils/test-data/setupSwapQuote'
import { setupThorswapDeps } from '../utils/test-data/setupThorswapDeps'
import { thorTradeApprovalNeeded } from './thorTradeApprovalNeeded'

jest.mock('../../utils/helpers/helpers')

describe('thorTradeApprovalNeeded', () => {
  const deps = setupThorswapDeps()
  const walletAddress = '0xc770eefad204b5180df6a14ee197d99d808ee52d'
  const wallet = {
    ethGetAddress: jest.fn(() => Promise.resolve(walletAddress)),
  } as unknown as HDWallet

  const { tradeQuote, sellAsset } = setupQuote()

  it('returns false if sellAsset assetId is ETH', async () => {
    const input = {
      quote: { ...tradeQuote, sellAsset: { ...sellAsset, assetId: 'eip155:1/slip44:60' } },
      wallet,
    }

    expect(await thorTradeApprovalNeeded({ deps, input })).toEqual({ approvalNeeded: false })
  })

  it('returns false if allowanceOnChain is greater than quote.sellAmount', async () => {
    const allowanceOnChain = '50'
    const input: ApprovalNeededInput<KnownChainIds.EthereumMainnet> = {
      quote: {
        ...tradeQuote,
        sellAmountBeforeFeesCryptoBaseUnit: '10',
        feeData: {
          chainSpecific: { gasPriceCryptoBaseUnit: '1000' },
          networkFeeCryptoBaseUnit: '0',
          sellAssetTradeFeeUsd: '0',
          buyAssetTradeFeeUsd: '0',
        },
      },
      wallet,
    }
    ;(getERC20Allowance as jest.Mock<unknown>).mockImplementation(() => allowanceOnChain)

    expect(await thorTradeApprovalNeeded({ deps, input })).toEqual({
      approvalNeeded: false,
    })
  })

  it('returns true if allowanceOnChain is less than quote.sellAmount', async () => {
    const allowanceOnChain = '5'
    const input = {
      quote: {
        ...tradeQuote,
        sellAmount: '10',
        feeData: {
          chainSpecific: { gasPriceCryptoBaseUnit: '1000' },
          networkFeeCryptoBaseUnit: '0',
          sellAssetTradeFeeUsd: '0',
          buyAssetTradeFeeUsd: '0',
        },
      },
      wallet,
    }
    ;(getERC20Allowance as jest.Mock<unknown>).mockImplementation(() => allowanceOnChain)

    expect(await thorTradeApprovalNeeded({ deps, input })).toEqual({
      approvalNeeded: true,
    })
  })
})
