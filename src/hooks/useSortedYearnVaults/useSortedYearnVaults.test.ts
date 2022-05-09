import { renderHook } from '@testing-library/react-hooks'
import { mockVault, mockVaultWithBalance } from 'test/mocks/vaults'
import { YearnVaultWithApyAndTvl } from 'hooks/useVaultWithoutBalance/useVaultWithoutBalance'
import { MergedEarnVault } from 'pages/Defi/hooks/useVaultBalances'

import { useSortedYearnVaults } from './useSortedYearnVaults'

const addressWithBalance1 = '0xa696a63cc78dffa1a63e9e50587c197387ff6c7e'
const addressWithBalance2 = '0xd9788f3931ede4d5018184e198699dc6d66c1915'
const addressWithBalance3 = '0xd9788f3931ede4d5018184e198699dc6d66c1916'
const address10MTVL1 = '0x0d4ea8536f9a13e4fba16042a46c30f092b06aa5'
const address10MTVL2 = '0x1b905331f7de2748f4d6a0678e1521e20347643f'
const address10MTVL3 = '0x2a38b9b0201ca39b17b460ed2f11e4929559071e'
const address5MTVL1 = '0x2d5d4869381c4fce34789bc1d38acce747e295ae'
const address5MTVL2 = '0x2dfb14e32e2f8156ec15a2c21c3a6c053af52be8'
const address5MTVL3 = '0x3b96d491f067912d18563d56858ba7d6ec67a6fa'
const address400KTVL1 = '0x3c5df3077bcf800640b5dae8c91106575a4826e6'
const address400KTVL2 = '0x04d73c87b20d372cb3240c72eefb9d79ba5e4959'
const address400KTVL3 = '0x4a3fe75762017db0ed73a71c9a06db7768db5e66'

jest.mock('pages/Defi/hooks/useVaultBalances', () => {
  return {
    useVaultBalances: () => {
      const vaults: Record<string, MergedEarnVault> = {}
      vaults[addressWithBalance1] = mockVaultWithBalance({
        vaultAddress: addressWithBalance1,
        fiatAmount: '222',
      })
      vaults[addressWithBalance2] = mockVaultWithBalance({
        vaultAddress: addressWithBalance2,
        fiatAmount: '111',
      })
      vaults[addressWithBalance3] = mockVaultWithBalance({
        vaultAddress: addressWithBalance3,
        fiatAmount: '333',
      })

      return {
        vaults,
        totalBalance: '0',
        loading: false,
      }
    },
  }
})

jest.mock('hooks/useVaultWithoutBalance/useVaultWithoutBalance', () => {
  return {
    useVaultWithoutBalance: () => {
      const vaults: Record<string, YearnVaultWithApyAndTvl> = {}
      vaults[address400KTVL3] = mockVault({
        vaultAddress: address400KTVL3,
        underlyingTokenBalanceUsdc: '400000',
        apy: 0.03,
      })
      vaults[address10MTVL2] = mockVault({
        vaultAddress: address10MTVL2,
        underlyingTokenBalanceUsdc: '10000002',
        apy: 0.03,
      })
      vaults[addressWithBalance1] = mockVault({ vaultAddress: addressWithBalance1 })
      vaults[address5MTVL3] = mockVault({
        vaultAddress: address5MTVL3,
        underlyingTokenBalanceUsdc: '5000002',
        apy: 0.3,
      })
      vaults[addressWithBalance2] = mockVault({ vaultAddress: addressWithBalance2 })
      vaults[address10MTVL1] = mockVault({
        vaultAddress: address10MTVL1,
        underlyingTokenBalanceUsdc: '10000001',
        apy: 0.01,
      })
      vaults[address5MTVL2] = mockVault({
        vaultAddress: address5MTVL2,
        underlyingTokenBalanceUsdc: '5000001',
        apy: 0.2,
      })
      vaults[address5MTVL1] = mockVault({
        vaultAddress: address5MTVL1,
        underlyingTokenBalanceUsdc: '5000003',
        apy: 0.1,
      })
      vaults[address400KTVL1] = mockVault({
        vaultAddress: address400KTVL1,
        underlyingTokenBalanceUsdc: '400000',
        apy: 0.004,
      })
      vaults[address400KTVL2] = mockVault({
        vaultAddress: address400KTVL2,
        underlyingTokenBalanceUsdc: '400000',
        apy: 0.5,
      })
      vaults[addressWithBalance3] = mockVault({ vaultAddress: addressWithBalance3 })
      vaults[address10MTVL3] = mockVault({
        vaultAddress: address10MTVL3,
        underlyingTokenBalanceUsdc: '10000003',
        apy: 0.02,
      })

      return {
        vaultsWithoutBalance: vaults,
        loading: false,
      }
    },
  }
})

describe('useSortedYearnVaults hook', () => {
  it('should sorted array depending on balance, TVL and apy', () => {
    const { result } = renderHook(() => useSortedYearnVaults())
    expect(result.current.length).toBe(12)
    // vaults with balance sorted by balance
    expect(result.current[0].vaultAddress).toBe(addressWithBalance3)
    expect(result.current[1].vaultAddress).toBe(addressWithBalance1)
    expect(result.current[2].vaultAddress).toBe(addressWithBalance2)

    // vaults without balance, TVL > 10M, sorted by apy
    expect(result.current[3].vaultAddress).toBe(address10MTVL2)
    expect(result.current[4].vaultAddress).toBe(address10MTVL3)
    expect(result.current[5].vaultAddress).toBe(address10MTVL1)

    // vaults without balance, 1M < TVL < 10M, sorted by apy
    expect(result.current[6].vaultAddress).toBe(address5MTVL3)
    expect(result.current[7].vaultAddress).toBe(address5MTVL2)
    expect(result.current[8].vaultAddress).toBe(address5MTVL1)

    // vaults without balance, TVL < 1M, sorted by apy
    expect(result.current[9].vaultAddress).toBe(address400KTVL2)
    expect(result.current[10].vaultAddress).toBe(address400KTVL3)
    expect(result.current[11].vaultAddress).toBe(address400KTVL1)
  })
})
