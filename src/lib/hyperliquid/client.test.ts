import { afterEach, describe, expect, it, vi } from 'vitest'

import {
  clearWallet,
  getCurrentNetwork,
  getInfoClient,
  getSubscriptionClient,
  initializeClients,
  isWalletConnected,
} from './client'

vi.mock('@nktkas/hyperliquid', () => ({
  InfoClient: vi.fn().mockImplementation(() => ({
    meta: vi.fn(),
    l2Book: vi.fn(),
    clearinghouseState: vi.fn(),
  })),
  ExchangeClient: vi.fn().mockImplementation(() => ({
    order: vi.fn(),
    cancel: vi.fn(),
  })),
  SubscriptionClient: vi.fn().mockImplementation(() => ({
    allMids: vi.fn(),
    l2Book: vi.fn(),
    unsubscribe: vi.fn(),
  })),
  HttpTransport: vi.fn().mockImplementation(config => ({
    url: config?.url,
  })),
  WebSocketTransport: vi.fn().mockImplementation(config => ({
    url: config?.url,
  })),
}))

describe('client', () => {
  afterEach(() => {
    clearWallet()
    vi.clearAllMocks()
  })

  describe('initializeClients', () => {
    it('should initialize with default mainnet configuration', () => {
      initializeClients()

      expect(getCurrentNetwork()).toBe('mainnet')
    })

    it('should initialize with testnet when specified', () => {
      initializeClients({ network: 'testnet' })

      expect(getCurrentNetwork()).toBe('testnet')
    })
  })

  describe('getInfoClient', () => {
    it('should return an initialized InfoClient', () => {
      const client = getInfoClient()

      expect(client).toBeDefined()
      expect(client).toHaveProperty('meta')
      expect(client).toHaveProperty('l2Book')
    })

    it('should return the same instance on subsequent calls', () => {
      const client1 = getInfoClient()
      const client2 = getInfoClient()

      expect(client1).toBe(client2)
    })
  })

  describe('getSubscriptionClient', () => {
    it('should return an initialized SubscriptionClient', () => {
      const client = getSubscriptionClient()

      expect(client).toBeDefined()
      expect(client).toHaveProperty('allMids')
      expect(client).toHaveProperty('l2Book')
    })

    it('should return the same instance on subsequent calls', () => {
      const client1 = getSubscriptionClient()
      const client2 = getSubscriptionClient()

      expect(client1).toBe(client2)
    })
  })

  describe('isWalletConnected', () => {
    it('should return false when no wallet is set', () => {
      expect(isWalletConnected()).toBe(false)
    })
  })

  describe('clearWallet', () => {
    it('should clear wallet state', () => {
      clearWallet()

      expect(isWalletConnected()).toBe(false)
    })
  })

  describe('API URLs', () => {
    it('should use mainnet URLs by default', () => {
      initializeClients({ network: 'mainnet' })

      expect(getCurrentNetwork()).toBe('mainnet')
    })

    it('should use testnet URLs when specified', () => {
      initializeClients({ network: 'testnet' })

      expect(getCurrentNetwork()).toBe('testnet')
    })
  })
})
