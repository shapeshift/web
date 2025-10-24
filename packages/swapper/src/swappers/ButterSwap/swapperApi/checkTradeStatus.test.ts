import { solanaChainId } from '@shapeshiftoss/caip'
import { TxStatus } from '@shapeshiftoss/unchained-client'
import { Ok } from '@sniptt/monads'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import * as utils from '../../../utils'
import * as xhr from '../xhr'
import { checkTradeStatus } from './checkTradeStatus'

// Mock the utility functions
vi.mock('../../../utils', () => ({
  checkSolanaSwapStatus: vi.fn(),
  checkEvmSwapStatus: vi.fn(),
  createDefaultStatusResponse: vi.fn(),
}))

// Mock the XHR functions
vi.mock('../xhr', () => ({
  getBridgeInfoBySourceHash: vi.fn(),
}))

describe('checkTradeStatus same-chain short-circuit', () => {
  const mockTxHash = '0x123'
  const mockAddress = '0xabc'
  const mockEvmChainId = 'eip155:1' // Ethereum
  const mockBscChainId = 'eip155:56' // BSC
  const mockUnknownChainId = 'cosmos:cosmoshub-4' // Non-EVM, non-Solana

  const mockAssertGetEvmChainAdapter = vi.fn()
  const mockAssertGetSolanaChainAdapter = vi.fn()
  const mockFetchIsSmartContractAddressQuery = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('should call checkSolanaSwapStatus for Solana same-chain swaps', async () => {
    const mockSolanaStatus = {
      status: TxStatus.Confirmed,
      buyTxHash: 'solana-tx',
      message: undefined,
    }
    vi.mocked(utils.checkSolanaSwapStatus).mockResolvedValue(mockSolanaStatus)

    const input = {
      txHash: mockTxHash,
      chainId: solanaChainId,
      address: mockAddress,
      swap: {
        sellAsset: { chainId: solanaChainId },
        buyAsset: { chainId: solanaChainId },
      },
      assertGetEvmChainAdapter: mockAssertGetEvmChainAdapter,
      assertGetSolanaChainAdapter: mockAssertGetSolanaChainAdapter,
      fetchIsSmartContractAddressQuery: mockFetchIsSmartContractAddressQuery,
    } as any

    const result = await checkTradeStatus(input)

    // Assert checkSolanaSwapStatus was called with correct params
    expect(utils.checkSolanaSwapStatus).toHaveBeenCalledWith({
      txHash: mockTxHash,
      address: mockAddress,
      assertGetSolanaChainAdapter: mockAssertGetSolanaChainAdapter,
    })

    // Assert other status checks were NOT called
    expect(utils.checkEvmSwapStatus).not.toHaveBeenCalled()
    expect(xhr.getBridgeInfoBySourceHash).not.toHaveBeenCalled()

    // Assert correct result
    expect(result).toEqual(mockSolanaStatus)
  })

  it('should call checkEvmSwapStatus for EVM same-chain swaps', async () => {
    const mockEvmStatus = { status: TxStatus.Confirmed, buyTxHash: 'evm-tx', message: undefined }
    vi.mocked(utils.checkEvmSwapStatus).mockResolvedValue(mockEvmStatus)

    const input = {
      txHash: mockTxHash,
      chainId: mockEvmChainId,
      address: mockAddress,
      swap: {
        sellAsset: { chainId: mockEvmChainId },
        buyAsset: { chainId: mockEvmChainId },
      },
      assertGetEvmChainAdapter: mockAssertGetEvmChainAdapter,
      assertGetSolanaChainAdapter: mockAssertGetSolanaChainAdapter,
      fetchIsSmartContractAddressQuery: mockFetchIsSmartContractAddressQuery,
    } as any

    const result = await checkTradeStatus(input)

    // Assert checkEvmSwapStatus was called with correct params
    expect(utils.checkEvmSwapStatus).toHaveBeenCalledWith({
      txHash: mockTxHash,
      chainId: mockEvmChainId,
      address: mockAddress,
      assertGetEvmChainAdapter: mockAssertGetEvmChainAdapter,
      fetchIsSmartContractAddressQuery: mockFetchIsSmartContractAddressQuery,
    })

    // Assert other status checks were NOT called
    expect(utils.checkSolanaSwapStatus).not.toHaveBeenCalled()
    expect(xhr.getBridgeInfoBySourceHash).not.toHaveBeenCalled()

    // Assert correct result
    expect(result).toEqual(mockEvmStatus)
  })

  it('should call createDefaultStatusResponse for unknown same-chain swaps', async () => {
    const mockDefaultStatus = { status: TxStatus.Pending, buyTxHash: undefined, message: undefined }
    vi.mocked(utils.createDefaultStatusResponse).mockReturnValue(mockDefaultStatus)

    const input = {
      txHash: mockTxHash,
      chainId: mockUnknownChainId,
      address: mockAddress,
      swap: {
        sellAsset: { chainId: mockUnknownChainId },
        buyAsset: { chainId: mockUnknownChainId },
      },
      assertGetEvmChainAdapter: mockAssertGetEvmChainAdapter,
      assertGetSolanaChainAdapter: mockAssertGetSolanaChainAdapter,
      fetchIsSmartContractAddressQuery: mockFetchIsSmartContractAddressQuery,
    } as any

    const result = await checkTradeStatus(input)

    // Assert createDefaultStatusResponse was called
    expect(utils.createDefaultStatusResponse).toHaveBeenCalledWith(mockTxHash)

    // Assert other status checks were NOT called
    expect(utils.checkSolanaSwapStatus).not.toHaveBeenCalled()
    expect(utils.checkEvmSwapStatus).not.toHaveBeenCalled()
    expect(xhr.getBridgeInfoBySourceHash).not.toHaveBeenCalled()

    // Assert correct result
    expect(result).toEqual(mockDefaultStatus)
  })

  it('should proceed to bridge polling for cross-chain swaps', async () => {
    const mockBridgeInfo = {
      id: 12345,
      state: 1, // Confirmed
      toHash: 'dest-tx',
      relayerHash: 'relayer-tx',
      relayerChain: { scanUrl: 'https://scan.url' },
    }

    vi.mocked(xhr.getBridgeInfoBySourceHash).mockResolvedValue(Ok(mockBridgeInfo as any))

    const input = {
      txHash: mockTxHash,
      chainId: mockEvmChainId,
      address: mockAddress,
      swap: {
        sellAsset: { chainId: mockEvmChainId },
        buyAsset: { chainId: mockBscChainId }, // Different chain
      },
      assertGetEvmChainAdapter: mockAssertGetEvmChainAdapter,
      assertGetSolanaChainAdapter: mockAssertGetSolanaChainAdapter,
      fetchIsSmartContractAddressQuery: mockFetchIsSmartContractAddressQuery,
    } as any

    const result = await checkTradeStatus(input)

    // Assert bridge polling function was called
    expect(xhr.getBridgeInfoBySourceHash).toHaveBeenCalledWith(mockTxHash)

    // Assert same-chain checks were NOT called
    expect(utils.checkSolanaSwapStatus).not.toHaveBeenCalled()
    expect(utils.checkEvmSwapStatus).not.toHaveBeenCalled()
    expect(utils.createDefaultStatusResponse).not.toHaveBeenCalled()

    // Assert correct result from bridge polling
    expect(result).toEqual({
      status: TxStatus.Confirmed,
      buyTxHash: 'dest-tx',
      relayerTxHash: 'relayer-tx',
      relayerExplorerTxLink: 'https://scan.url',
      message: undefined,
    })
  })

  it('should handle missing swap data and proceed to bridge polling', async () => {
    const mockBridgeInfo = {
      id: 99999,
      state: 0, // Pending
    }

    vi.mocked(xhr.getBridgeInfoBySourceHash).mockResolvedValue(Ok(mockBridgeInfo as any))

    const input = {
      txHash: mockTxHash,
      chainId: mockEvmChainId,
      address: mockAddress,
      swap: undefined, // No swap data
      assertGetEvmChainAdapter: mockAssertGetEvmChainAdapter,
      assertGetSolanaChainAdapter: mockAssertGetSolanaChainAdapter,
      fetchIsSmartContractAddressQuery: mockFetchIsSmartContractAddressQuery,
    } as any

    const result = await checkTradeStatus(input)

    // Assert bridge polling was used (no swap data means can't determine if same-chain)
    expect(xhr.getBridgeInfoBySourceHash).toHaveBeenCalledWith(mockTxHash)

    // Assert same-chain checks were NOT called
    expect(utils.checkSolanaSwapStatus).not.toHaveBeenCalled()
    expect(utils.checkEvmSwapStatus).not.toHaveBeenCalled()

    expect(result.status).toEqual(TxStatus.Pending)
  })
})
