import { createConfig, http, injected, mock } from '@wagmi/core'
import { mainnet } from 'viem/chains'
import { afterEach, describe, expect, it } from 'vitest'

import { guardWalletInitiatedConnects, isUserConnectedConnector } from '../walletInitiatedConnect'

const ACCOUNT = '0x7016e6a3f1d56b4d5e8c5d5a0e1b3f6c9a73b063'

const setConnected = (connectorIds: string[]) =>
  window.localStorage.setItem(
    '@appkit/connections',
    JSON.stringify({ eip155: connectorIds.map(connectorId => ({ connectorId, accounts: [] })) }),
  )

const setDisconnected = (connectorIds: string[]) =>
  window.localStorage.setItem(
    '@appkit/disconnected_connector_ids',
    JSON.stringify({ eip155: connectorIds }),
  )

const makeConfig = () =>
  createConfig({
    chains: [mainnet],
    connectors: [injected({ target: 'metaMask' })],
    multiInjectedProviderDiscovery: false,
    transports: { [mainnet.id]: http() },
  })

// What an injected connector does when the wallet announces an account on its own
const walletAnnouncesAccount = (config: ReturnType<typeof makeConfig>, index = 0) => {
  const connector = config.connectors[index]
  connector.emitter.emit('connect', { accounts: [ACCOUNT], chainId: mainnet.id })
  return connector
}

afterEach(() => window.localStorage.clear())

describe('isUserConnectedConnector', () => {
  it('is false with no AppKit records, as in a fresh incognito window', () => {
    expect(isUserConnectedConnector('io.metamask')).toBe(false)
  })

  it('is true for a wallet the user connected', () => {
    setConnected(['io.metamask'])
    expect(isUserConnectedConnector('io.metamask')).toBe(true)
  })

  it('is false once the user disconnected it, even though AppKit keeps the connection record', () => {
    setConnected(['io.rabby'])
    setDisconnected(['io.rabby'])
    expect(isUserConnectedConnector('io.rabby')).toBe(false)
  })

  it('matches ids case-insensitively, like AppKit', () => {
    setConnected(['io.MetaMask'])
    expect(isUserConnectedConnector('io.metamask')).toBe(true)
  })

  it('is false when the records are unreadable', () => {
    window.localStorage.setItem('@appkit/connections', '{not json')
    expect(isUserConnectedConnector('io.metamask')).toBe(false)
  })
})

describe('guardWalletInitiatedConnects', () => {
  it('without the guard, a wallet announcing itself connects wagmi', () => {
    const config = makeConfig()
    walletAnnouncesAccount(config)
    expect(config.state.status).toBe('connected')
  })

  it('ignores a wallet that announces itself before the user ever connected it', () => {
    const config = makeConfig()
    guardWalletInitiatedConnects(config)

    walletAnnouncesAccount(config)

    expect(config.state.status).toBe('disconnected')
    expect(config.state.connections.size).toBe(0)
  })

  it('ignores a wallet the user disconnected', () => {
    const config = makeConfig()
    guardWalletInitiatedConnects(config)
    const id = config.connectors[0].id
    setConnected([id])
    setDisconnected([id])

    walletAnnouncesAccount(config)

    expect(config.state.status).toBe('disconnected')
  })

  it('lets a wallet the user connected restore its session', () => {
    const config = makeConfig()
    guardWalletInitiatedConnects(config)
    setConnected([config.connectors[0].id])

    walletAnnouncesAccount(config)

    expect(config.state.status).toBe('connected')
  })

  it('guards wallets that announce after the config is created', () => {
    const config = makeConfig()
    guardWalletInitiatedConnects(config)

    const late = config._internal.connectors.setup(injected({ target: 'rabby' }))
    config._internal.connectors.setState(connectors => [...connectors, late])

    walletAnnouncesAccount(config, config.connectors.length - 1)

    expect(config.state.status).toBe('disconnected')
  })

  it('leaves non-injected connectors alone', () => {
    const config = createConfig({
      chains: [mainnet],
      connectors: [mock({ accounts: [ACCOUNT] })],
      multiInjectedProviderDiscovery: false,
      transports: { [mainnet.id]: http() },
    })
    guardWalletInitiatedConnects(config)

    config.connectors[0].emitter.emit('connect', { accounts: [ACCOUNT], chainId: mainnet.id })

    expect(config.state.status).toBe('connected')
  })
})
