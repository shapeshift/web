import { FeeDataKey } from '@shapeshiftoss/chain-adapters'
import { getAssetData } from '@shapeshiftoss/market-service'
import { act, renderHook } from '@testing-library/react-hooks'
import { useWallet } from 'context/WalletProvider/WalletProvider'
import { useFormContext, useWatch } from 'react-hook-form'

import { useSendFees } from './useSendFees'

jest.mock('@shapeshiftoss/market-service')
jest.mock('react-hook-form')
jest.mock('context/WalletProvider/WalletProvider')

const fees = {
  [FeeDataKey.Slow]: {
    feeUnits: '42000',
    feeUnitPrice: '76000000000',
    networkFee: '3100000000000000'
  },
  [FeeDataKey.Average]: {
    feeUnits: '42000',
    feeUnitPrice: '118000000000',
    networkFee: '4900000000000000'
  },
  [FeeDataKey.Fast]: {
    feeUnits: '42000',
    feeUnitPrice: '145845250000',
    networkFee: '6120000000000000'
  }
}

const ethAsset = {
  name: 'Ethereum',
  network: 'ethereum',
  price: 3500,
  symbol: 'eth'
}

const setup = ({ asset = {}, estimatedFees = {}, wallet = {} }) => {
  // @ts-ignore
  useWallet.mockImplementation(() => ({ state: { wallet } }))
  // @ts-ignore
  useWatch.mockImplementation(() => ({ asset, estimatedFees }))
  return renderHook(() => useSendFees())
}

describe('useSendFees', () => {
  beforeEach(() => {
    // @ts-ignore
    useFormContext.mockImplementation(() => ({ control: {} }))
    // @ts-ignore
    getAssetData.mockImplementation(() => ({
      price: 3500,
      network: 'ethereum'
    }))
  })

  it('returns the fees with market data', async () => {
    return await act(async () => {
      const { waitForValueToChange, result } = setup({ asset: ethAsset, estimatedFees: fees })
      await waitForValueToChange(() => result.current.fees)
      expect(result.current.fees?.slow.amount).toBe('10.85')
      expect(result.current.fees?.average.amount).toBe('17.15')
      expect(result.current.fees?.fast.amount).toBe('21.42')
    })
  })

  it('returns null fees if no wallet is present', async () => {
    return await act(async () => {
      const { result } = setup({
        asset: ethAsset,
        estimatedFees: fees,
        // @ts-ignore Type 'null' is not assignable to type '{} | undefined'
        wallet: null
      })
      expect(result.current.fees).toBe(null)
    })
  })
})
