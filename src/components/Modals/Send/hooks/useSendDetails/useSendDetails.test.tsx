import { getMarketData } from '@shapeshiftoss/market-service'
import { chainAdapters, ChainTypes, ContractTypes, NetworkTypes } from '@shapeshiftoss/types'
import { act, renderHook } from '@testing-library/react-hooks'
import { useFormContext, useWatch } from 'react-hook-form'
import { useHistory } from 'react-router-dom'
import { useChainAdapters } from 'context/ChainAdaptersProvider/ChainAdaptersProvider'
import { useWallet } from 'context/WalletProvider/WalletProvider'
import { useGetAssetData } from 'hooks/useAsset/useAsset'
import { useFlattenedBalances } from 'hooks/useBalances/useFlattenedBalances'
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
jest.mock('hooks/useBalances/useFlattenedBalances')

const balances: ReturnType<typeof useFlattenedBalances>['balances'] = {
  [ChainTypes.Ethereum]: {
    chain: ChainTypes.Ethereum,
    network: NetworkTypes.MAINNET,
    symbol: 'ETH',
    pubkey: '0x0000000000000000000000000000000000000000',
    balance: '5000000000000000000',
    chainSpecific: {
      nonce: 0,
      tokens: [
        {
          contractType: ContractTypes.ERC20,
          name: 'THORChain ETH.RUNE',
          contract: '0x3155BA85D5F96b2d030a4966AF206230e46849cb',
          symbol: 'RUNE',
          precision: 18,
          balance: '21000000000000000000'
        }
      ]
    }
  },
  '0x3155ba85d5f96b2d030a4966af206230e46849cb': {
    contractType: ContractTypes.ERC20,
    chain: ChainTypes.Ethereum,
    name: 'THORChain ETH.RUNE',
    contract: '0x3155BA85D5F96b2d030a4966AF206230e46849cb',
    symbol: 'RUNE',
    precision: 18,
    balance: '21000000000000000000'
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
  const crypto = bnOrZero(balances.ethereum.balance).div('1e18')
  const fiat = crypto.times(ethAsset.price)
  return {
    crypto,
    fiat
  }
}

const getRuneAccountBalances = () => {
  const crypto = bnOrZero(balances['0x3155ba85d5f96b2d030a4966af206230e46849cb'].balance).div(
    '1e18'
  )
  const fiat = crypto.times(erc20RuneAsset.price)
  return {
    crypto,
    fiat
  }
}

const getAssetData = () =>
  Promise.resolve({
    name: 'Ethereum',
    chain: ChainTypes.Ethereum,
    price: '3500',
    symbol: 'ETH',
    precision: 18
  })

const setup = ({
  asset = ethAsset,
  assetBalance = {},
  accountBalances = {},
  balanceError = null,
  formErrors = {},
  setError = jest.fn(),
  setValue = jest.fn()
}) => {
  ;(useGetAssetData as jest.Mock<unknown>).mockReturnValueOnce(getAssetData)
  ;(useWatch as jest.Mock<unknown>).mockImplementation(() => [
    asset,
    '0x3155BA85D5F96b2d030a4966AF206230e46849cb'
  ])
  ;(useAccountBalances as jest.Mock<unknown>).mockImplementation(() => ({
    assetBalance,
    accountBalances
  }))
  ;(useFlattenedBalances as jest.Mock<unknown>).mockImplementation(() => ({
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
      crypto: { amount: '1' },
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
    ;(getMarketData as jest.Mock<unknown>).mockImplementation(() => ({
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
        assetBalance: balances.ethereum,
        accountBalances: getEthAccountBalances()
      })
      expect(result.current.amountFieldError).toBe('')
      expect(result.current.balancesLoading).toBe(false)
      expect(result.current.fieldName).toBe('fiat.amount')
      expect(result.current.loading).toBe(false)
    })
  })

  it('toggles the input field', async () => {
    return await act(async () => {
      const { waitForValueToChange, result } = setup({
        assetBalance: balances.ethereum,
        accountBalances: getEthAccountBalances()
      })
      expect(result.current.fieldName).toBe('fiat.amount')
      act(() => {
        result.current.toggleCurrency()
      })
      await waitForValueToChange(() => result.current.fieldName)
      expect(result.current.fieldName).toBe('crypto.amount')
    })
  })

  it('toggles the amount input error to the fiat.amount/crypto.amount field', async () => {
    return await act(async () => {
      let setError = jest.fn()
      const { waitForValueToChange, result } = setup({
        assetBalance: balances.ethereum,
        accountBalances: getEthAccountBalances(),
        formErrors: {
          fiat: { amount: { message: 'common.insufficientFunds' } }
        },
        setError
      })

      act(() => {
        result.current.toggleCurrency()
      })

      await waitForValueToChange(() => result.current.fieldName)

      expect(result.current.fieldName).toBe('crypto.amount')
    })
  })

  it('handles input change on fiat.amount', async () => {
    const setValue = jest.fn()
    await act(async () => {
      const { result } = setup({
        assetBalance: balances.ethereum,
        accountBalances: getEthAccountBalances(),
        setValue
      })
      // Field is set to fiat.amount
      expect(result.current.fieldName).toBe('fiat.amount')

      // Set fiat amount
      await act(async () => {
        result.current.handleInputChange('3500')
        await new Promise(r => setTimeout(r, 1500)) // hack to wait because handleInputChange is now debounced for 1 second
        expect(setValue).toHaveBeenCalledWith('crypto.amount', '1')

        setValue.mockClear()

        await result.current.handleInputChange('0')
        await new Promise(r => setTimeout(r, 1500)) // hack to wait because handleInputChange is now debounced for 1 second
        expect(setValue).toHaveBeenCalledWith('crypto.amount', '0')
        setValue.mockClear()
      })
    })
  })

  it('handles input change on crypto.amount', async () => {
    const setValue = jest.fn()
    await act(async () => {
      const { waitForValueToChange, result } = setup({
        assetBalance: balances.ethereum,
        accountBalances: getEthAccountBalances(),
        setValue
      })
      // Field is set to fiat.amount
      expect(result.current.fieldName).toBe('fiat.amount')

      // toggle field to crypto.amount
      act(() => {
        result.current.toggleCurrency()
      })
      await waitForValueToChange(() => result.current.fieldName)
      expect(result.current.fieldName).toBe('crypto.amount')

      // Set crypto amount
      await act(async () => {
        result.current.handleInputChange('1')
        await new Promise(r => setTimeout(r, 1500)) // hack to wait because handleInputChange is now debounced for 1 second
        expect(setValue).toHaveBeenCalledWith('fiat.amount', '3500')
        setValue.mockClear()
      })
    })
  })

  it('handles setting up send max for network asset', async () => {
    const setValue = jest.fn()
    return await act(async () => {
      const { result } = setup({
        assetBalance: balances.ethereum,
        accountBalances: getEthAccountBalances(),
        setValue
      })
      await act(async () => {
        await result.current.handleSendMax()
        expect(setValue).toHaveBeenNthCalledWith(1, 'crypto.amount', '5')
        expect(setValue).toHaveBeenNthCalledWith(2, 'fiat.amount', '17500.00')
      })
    })
  })

  it('handles setting up send max for erc20', async () => {
    const setValue = jest.fn()
    return await act(async () => {
      const { result } = setup({
        asset: erc20RuneAsset,
        assetBalance: balances['0x3155ba85d5f96b2d030a4966af206230e46849cb'],
        accountBalances: getRuneAccountBalances(),
        setValue
      })
      await act(async () => {
        await result.current.handleSendMax()
        expect(setValue).toHaveBeenNthCalledWith(1, 'crypto.amount', '21')
        expect(setValue).toHaveBeenNthCalledWith(2, 'fiat.amount', '210.00')
      })
    })
  })
})
