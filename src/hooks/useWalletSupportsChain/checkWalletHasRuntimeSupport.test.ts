// @vitest-environment jsdom
import { btcChainId, ethChainId, solanaChainId } from '@shapeshiftoss/caip'
import type { HDWallet } from '@shapeshiftoss/hdwallet-core'
import { describe, expect, it, vi } from 'vitest'

// Mock isMetaMask
const mockIsMetaMask = vi.fn()
vi.mock('@shapeshiftoss/hdwallet-core/wallet', () => ({
  isMetaMask: (...args: unknown[]) => mockIsMetaMask(...args),
  // Stub out all the supports* functions - we only care about runtime support checks
  supportsETH: () => true,
  supportsBTC: () => true,
  supportsSolana: () => true,
  supportsArbitrum: () => true,
  supportsAvalanche: () => true,
  supportsBase: () => true,
  supportsBerachain: () => true,
  supportsBlast: () => true,
  supportsBob: () => true,
  supportsBSC: () => true,
  supportsCelo: () => true,
  supportsCosmos: () => true,
  supportsCronos: () => true,
  supportsEthereal: () => true,
  supportsFlowEvm: () => true,
  supportsGnosis: () => true,
  supportsHemi: () => true,
  supportsHyperEvm: () => true,
  supportsInk: () => true,
  supportsKatana: () => true,
  supportsLinea: () => true,
  supportsMantle: () => true,
  supportsMayachain: () => true,
  supportsMegaEth: () => true,
  supportsMode: () => true,
  supportsMonad: () => true,
  supportsOptimism: () => true,
  supportsPlasma: () => true,
  supportsPlume: () => true,
  supportsPolygon: () => true,
  supportsScroll: () => true,
  supportsSei: () => true,
  supportsSoneium: () => true,
  supportsSonic: () => true,
  supportsStarknet: () => true,
  supportsStory: () => true,
  supportsSui: () => true,
  supportsThorchain: () => true,
  supportsTron: () => true,
  supportsUnichain: () => true,
  supportsWorldChain: () => true,
  supportsZkSyncEra: () => true,
  isPhantom: () => false,
  isGridPlus: () => false,
  isVultisig: () => false,
}))

const mockIsMetaMaskNativeMultichain = vi.fn()
vi.mock('@shapeshiftoss/hdwallet-metamask-multichain', () => ({
  isMetaMaskNativeMultichain: (...args: unknown[]) => mockIsMetaMaskNativeMultichain(...args),
}))

vi.mock('@shapeshiftoss/chain-adapters', () => ({
  isEvmChainId: (chainId: string) => chainId === ethChainId,
}))

vi.mock('@/lib/mipd', () => ({
  METAMASK_RDNS: 'io.metamask',
}))

vi.mock('@/lib/utils', () => ({
  isNativeHDWallet: () => false,
  isLedgerHDWallet: () => false,
  isTrezorHDWallet: () => false,
}))

vi.mock('@/lib/utils/near', () => ({
  supportsNear: () => true,
}))

vi.mock('@/lib/utils/ton', () => ({
  supportsTon: () => true,
}))

// Mock the store to return all feature flags as true
vi.mock('@/state/store', () => ({
  store: {
    getState: () => ({}),
  },
  useAppSelector: vi.fn(),
}))

vi.mock('@/state/slices/selectors', () => ({
  selectFeatureFlag: () => true,
}))

const { walletSupportsChain } = await import('./useWalletSupportsChain')

const makeWallet = (overrides: Record<string, unknown> = {}): HDWallet =>
  ({
    _isMetaMask: true,
    providerRdns: 'io.metamask',
    ...overrides,
  }) as unknown as HDWallet

describe('checkWalletHasRuntimeSupport (via walletSupportsChain)', () => {
  describe('MetaMask non-native + no snap + non-EVM chain', () => {
    it('should return false - no runtime support for non-EVM without snap or native multichain', () => {
      mockIsMetaMask.mockReturnValue(true)
      mockIsMetaMaskNativeMultichain.mockReturnValue(false)

      const wallet = makeWallet()
      const result = walletSupportsChain({
        chainId: btcChainId,
        wallet,
        isSnapInstalled: false,
        checkConnectedAccountIds: false,
      })

      expect(result).toBe(false)
    })
  })

  describe('MetaMask native multichain + non-EVM chain', () => {
    it('should return true - native multichain bypasses snap requirement', () => {
      mockIsMetaMask.mockReturnValue(true)
      mockIsMetaMaskNativeMultichain.mockReturnValue(true)

      const wallet = makeWallet({ _isMetaMaskNativeMultichain: true })
      const result = walletSupportsChain({
        chainId: btcChainId,
        wallet,
        isSnapInstalled: false,
        checkConnectedAccountIds: false,
      })

      expect(result).toBe(true)
    })

    it('should return true for Solana chain', () => {
      mockIsMetaMask.mockReturnValue(true)
      mockIsMetaMaskNativeMultichain.mockReturnValue(true)

      const wallet = makeWallet({ _isMetaMaskNativeMultichain: true })
      const result = walletSupportsChain({
        chainId: solanaChainId,
        wallet,
        isSnapInstalled: false,
        checkConnectedAccountIds: false,
      })

      expect(result).toBe(true)
    })
  })

  describe('non-MetaMask wallet', () => {
    it('should not be affected by MetaMask checks', () => {
      mockIsMetaMask.mockReturnValue(false)
      mockIsMetaMaskNativeMultichain.mockReturnValue(false)

      const wallet = makeWallet({ _isMetaMask: false })
      // A non-MM wallet with BTC support should return true
      const result = walletSupportsChain({
        chainId: btcChainId,
        wallet,
        isSnapInstalled: false,
        checkConnectedAccountIds: false,
      })

      expect(result).toBe(true)
    })

    it('should return true for EVM chain', () => {
      mockIsMetaMask.mockReturnValue(false)
      mockIsMetaMaskNativeMultichain.mockReturnValue(false)

      const wallet = makeWallet({ _isMetaMask: false })
      const result = walletSupportsChain({
        chainId: ethChainId,
        wallet,
        isSnapInstalled: false,
        checkConnectedAccountIds: false,
      })

      expect(result).toBe(true)
    })
  })

  describe('MetaMask with snap installed + non-EVM', () => {
    it('should return true when snap is installed and rdns matches', () => {
      mockIsMetaMask.mockReturnValue(true)
      mockIsMetaMaskNativeMultichain.mockReturnValue(false)

      const wallet = makeWallet()
      const result = walletSupportsChain({
        chainId: btcChainId,
        wallet,
        isSnapInstalled: true,
        checkConnectedAccountIds: false,
      })

      expect(result).toBe(true)
    })
  })

  describe('MetaMask with snap installed but wrong rdns', () => {
    it('should return false - snap installed but not actual MM', () => {
      mockIsMetaMask.mockReturnValue(true)
      mockIsMetaMaskNativeMultichain.mockReturnValue(false)

      const wallet = makeWallet({ providerRdns: 'io.rabby' })
      const result = walletSupportsChain({
        chainId: btcChainId,
        wallet,
        isSnapInstalled: true,
        checkConnectedAccountIds: false,
      })

      expect(result).toBe(false)
    })
  })
})
