import { findByCaip19 } from '@shapeshiftoss/market-service'
import { chainAdapters, ChainTypes, NetworkTypes } from '@shapeshiftoss/types'
import { act, renderHook } from '@testing-library/react-hooks'
import { useFormContext, useWatch } from 'react-hook-form'
import { useHistory } from 'react-router-dom'
import { useChainAdapters } from 'context/ChainAdaptersProvider/ChainAdaptersProvider'
import { useWallet } from 'context/WalletProvider/WalletProvider'
import { Balances, useBalances } from 'hooks/useBalances/useBalances'
import { TestProviders } from 'jest/TestProviders'
import { bnOrZero } from 'lib/bignumber/bignumber'

import { useAccountBalances } from '../useAccountBalances/useAccountBalances'
import { useSendDetails } from './useSendDetails'

jest.mock('@shapeshiftoss/market-service')
jest.mock('react-hook-form')
jest.mock('react-router-dom', () => ({ useHistory: jest.fn() }))
jest.mock('components/Modals/Send/hooks/useAccountBalances/useAccountBalances')
jest.mock('context/WalletProvider/WalletProvider')
jest.mock('context/ChainAdaptersProvider/ChainAdaptersProvider')
jest.mock('hooks/useAsset/useAsset')
jest.mock('hooks/useBalances/useBalances')

const ethCaip2 = 'eip155:1'
const ethCaip19 = 'eip155:1/slip44:60'
const runeCaip19 = 'eip155:1/erc20:0x3155ba85d5f96b2d030a4966af206230e46849cb'

const balances: Balances = {
  [ethCaip19]: {
    caip2: ethCaip2,
    caip19: ethCaip19,
    chain: ChainTypes.Ethereum,
    pubkey: '0x0000000000000000000000000000000000000000',
    balance: '5000000000000000000',
    chainSpecific: {
      nonce: 0,
      tokens: [{ caip19: runeCaip19, balance: '21000000000000000000' }]
    }
  },
  [runeCaip19]: {
    caip2: ethCaip2,
    caip19: runeCaip19,
    chain: ChainTypes.Ethereum,
    balance: '21000000000000000000',
    pubkey: '0x0000000000000000000000000000000000000000',
    chainSpecific: {
      nonce: 0,
      tokens: [{ caip19: runeCaip19, balance: '21000000000000000000' }]
    }
  }
}

const ethAsset = {
  chain: ChainTypes.Ethereum,
  name: 'Ethereum',
  network: NetworkTypes.MAINNET,
  price: 3500,
  symbol: 'eth',
  precision: 18
}

const erc20RuneAsset = {
  chain: ChainTypes.Ethereum,
  tokenId: '0x3155ba85d5f96b2d030a4966af206230e46849cb',
  name: 'THORChain (ERC20)',
  network: NetworkTypes.MAINNET,
  price: 10,
  symbol: 'rune',
  precision: 18
}

const estimatedFees = {
  [chainAdapters.FeeDataKey.Fast]: {
    networkFee: '6000000000000000',
    chainSpecific: {
      feePerTx: '6000000000000000'
    }
  }
}

const getEthAccountBalances = () => {
  const crypto = bnOrZero(balances[ethCaip19].balance).div('1e18')
  const fiat = crypto.times(ethAsset.price)
  return {
    crypto,
    fiat
  }
}

const getRuneAccountBalances = () => {
  const crypto = bnOrZero(balances[runeCaip19].balance).div('1e18')
  const fiat = crypto.times(erc20RuneAsset.price)
  return {
    crypto,
    fiat
  }
}

// const getAssetData = () =>
//   Promise.resolve({
//     name: 'Ethereum',
//     chain: ChainTypes.Ethereum,
//     price: '3500',
//     symbol: 'ETH',
//     precision: 18
//   })

const setup = ({
  asset = ethAsset,
  assetBalance = {},
  accountBalances = {},
  balanceError = null,
  formErrors = {},
  setError = jest.fn(),
  setValue = jest.fn()
}) => {
  // ;(useGetAssetData as jest.Mock<unknown>).mockReturnValueOnce(getAssetData)
  ;(useWatch as jest.Mock<unknown>).mockImplementation(() => [
    asset,
    '0x3155BA85D5F96b2d030a4966AF206230e46849cb'
  ])
  ;(useAccountBalances as jest.Mock<unknown>).mockImplementation(() => ({
    assetBalance,
    accountBalances
  }))
  ;(useBalances as jest.Mock<unknown>).mockImplementation(() => ({
    balances,
    error: balanceError,
    loading: false
  }))
  ;(useFormContext as jest.Mock<unknown>).mockImplementation(() => ({
    clearErrors: jest.fn(),
    setError,
    setValue,
    formState: { errors: formErrors },
    getValues: () => ({
      cryptoAmount: '1',
      asset
    })
  }))

  const wrapper: React.FC = ({ children }) => <TestProviders>{children}</TestProviders>
  return renderHook(() => useSendDetails(), { wrapper })
}

describe('useSendDetails', () => {
  beforeEach(() => {
    ;(useWallet as jest.Mock<unknown>).mockImplementation(() => ({ state: { wallet: {} } }))
    ;(useHistory as jest.Mock<unknown>).mockImplementation(() => ({ push: jest.fn() }))
    ;(useChainAdapters as jest.Mock<unknown>).mockImplementation(() => ({
      byChain: () => ({
        getAddress: () => '0xMyWalletsAddress',
        getFeeData: () => estimatedFees,
        buildSendTransaction: () => ({
          txToSign: {}
        })
      })
    }))
    ;(findByCaip19 as jest.Mock<unknown>).mockImplementation(() => ({
      price: 3500,
      network: 'ethereum'
    }))
  })

  afterEach(() => {
    jest.restoreAllMocks()
  })

  it('returns the default useSendDetails state', async () => {
    return await act(async () => {
      const { result } = setup({
        assetBalance: balances[ethCaip19],
        accountBalances: getEthAccountBalances()
      })
      expect(result.current.balancesLoading).toBe(false)
      expect(result.current.fieldName).toBe('fiatAmount')
      expect(result.current.loading).toBe(false)
    })
  })

  it('toggles the input field', async () => {
    return await act(async () => {
      const { waitForValueToChange, result } = setup({
        assetBalance: balances[ethCaip19],
        accountBalances: getEthAccountBalances()
      })
      expect(result.current.fieldName).toBe('fiatAmount')
      act(() => {
        result.current.toggleCurrency()
      })
      await waitForValueToChange(() => result.current.fieldName)
      expect(result.current.fieldName).toBe('cryptoAmount')
    })
  })

  it('toggles the amount input error to the fiatAmount/cryptoAmount field', async () => {
    return await act(async () => {
      let setError = jest.fn()
      const { waitForValueToChange, result } = setup({
        assetBalance: balances[ethCaip19],
        accountBalances: getEthAccountBalances(),
        formErrors: {
          fiatAmount: { message: 'common.insufficientFunds' }
        },
        setError
      })

      act(() => {
        result.current.toggleCurrency()
      })

      await waitForValueToChange(() => result.current.fieldName)

      expect(result.current.fieldName).toBe('cryptoAmount')
    })
  })

  it('handles input change on fiatAmount', async () => {
    const setValue = jest.fn()
    await act(async () => {
      const { result } = setup({
        assetBalance: balances[ethCaip19],
        accountBalances: getEthAccountBalances(),
        setValue
      })
      // Field is set to fiatAmount
      expect(result.current.fieldName).toBe('fiatAmount')

      // Set fiat amount
      await act(async () => {
        result.current.handleInputChange('3500')
        await new Promise(r => setTimeout(r, 1500)) // hack to wait because handleInputChange is now debounced for 1 second
        expect(setValue).toHaveBeenCalledWith('cryptoAmount', '1')

        setValue.mockClear()

        await result.current.handleInputChange('0')
        await new Promise(r => setTimeout(r, 1500)) // hack to wait because handleInputChange is now debounced for 1 second
        expect(setValue).toHaveBeenCalledWith('cryptoAmount', '0')
        setValue.mockClear()
      })
    })
  })

  it('handles input change on cryptoAmount', async () => {
    const setValue = jest.fn()
    await act(async () => {
      const { waitForValueToChange, result } = setup({
        assetBalance: balances[ethCaip19],
        accountBalances: getEthAccountBalances(),
        setValue
      })
      // Field is set to fiatAmount
      expect(result.current.fieldName).toBe('fiatAmount')

      // toggle field to cryptoAmount
      act(() => {
        result.current.toggleCurrency()
      })
      await waitForValueToChange(() => result.current.fieldName)
      expect(result.current.fieldName).toBe('cryptoAmount')

      // Set crypto amount
      await act(async () => {
        result.current.handleInputChange('1')
        await new Promise(r => setTimeout(r, 1500)) // hack to wait because handleInputChange is now debounced for 1 second
        expect(setValue).toHaveBeenCalledWith('fiatAmount', '3500')
        setValue.mockClear()
      })
    })
  })

  it('handles setting up send max for network asset', async () => {
    const setValue = jest.fn()
    return await act(async () => {
      const { result } = setup({
        assetBalance: balances[ethCaip19],
        accountBalances: getEthAccountBalances(),
        setValue
      })
      await act(async () => {
        await result.current.handleSendMax()
        expect(setValue).toHaveBeenNthCalledWith(1, 'sendMax', true)
        expect(setValue).toHaveBeenNthCalledWith(2, 'estimatedFees', {
          fast: { chainSpecific: { feePerTx: '6000000000000000' }, networkFee: '6000000000000000' }
        })
        expect(setValue).toHaveBeenNthCalledWith(3, 'cryptoAmount', '5')
        expect(setValue).toHaveBeenNthCalledWith(4, 'fiatAmount', '17500.00')
      })
    })
  })

  it('handles setting up send max for erc20', async () => {
    const setValue = jest.fn()
    return await act(async () => {
      const { result } = setup({
        asset: erc20RuneAsset,
        assetBalance: balances[runeCaip19],
        accountBalances: getRuneAccountBalances(),
        setValue
      })
      await act(async () => {
        await result.current.handleSendMax()
        expect(setValue).toHaveBeenNthCalledWith(1, 'sendMax', true)
        expect(setValue).toHaveBeenNthCalledWith(2, 'estimatedFees', {
          fast: { chainSpecific: { feePerTx: '6000000000000000' }, networkFee: '6000000000000000' }
        })
        expect(setValue).toHaveBeenNthCalledWith(3, 'cryptoAmount', '21')
      })
    })
  })
})
