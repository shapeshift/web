import type { Connector, CreateConnectorFn } from '@wagmi/core'
import { createConfig, http, injected, reconnect } from '@wagmi/core'
import { mainnet } from 'viem/chains'
import { afterEach, describe, expect, it } from 'vitest'

import { guardWalletInitiatedConnects } from '../walletInitiatedConnect'

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

const makeConfig = (connector: CreateConnectorFn = injected({ target: 'metaMask' })) =>
  createConfig({
    chains: [mainnet],
    connectors: [connector],
    multiInjectedProviderDiscovery: false,
    transports: { [mainnet.id]: http() },
  })

// What an injected connector does when the wallet announces an account on its own
const walletAnnouncesAccount = (connector: Connector) =>
  connector.emitter.emit('connect', { accounts: [ACCOUNT], chainId: mainnet.id })

// A wallet that already trusts the site, so it reports an account without prompting
const trustingProvider = {
  request: ({ method }: { method: string }) => {
    if (method === 'eth_accounts') return Promise.resolve([ACCOUNT])
    if (method === 'eth_chainId') return Promise.resolve('0x1')
    return Promise.resolve(null)
  },
  on: () => undefined,
  removeListener: () => undefined,
}

const makeTrustingConfig = () =>
  makeConfig(
    injected({ target: { id: 'io.rabby', name: 'Rabby', provider: trustingProvider as never } }),
  )

afterEach(() => window.localStorage.clear())

describe('guardWalletInitiatedConnects', () => {
  it('without the guard, a wallet announcing itself connects wagmi', () => {
    const config = makeConfig()
    walletAnnouncesAccount(config.connectors[0])
    expect(config.state.status).toBe('connected')
  })

  it('ignores a wallet that announces itself before the user ever connected it', () => {
    const config = makeConfig()
    guardWalletInitiatedConnects(config)

    walletAnnouncesAccount(config.connectors[0])

    expect(config.state.status).toBe('disconnected')
    expect(config.state.connections.size).toBe(0)
  })

  it('ignores a wallet the user disconnected', () => {
    const config = makeConfig()
    guardWalletInitiatedConnects(config)
    const id = config.connectors[0].id
    setConnected([id])
    setDisconnected([id])

    walletAnnouncesAccount(config.connectors[0])

    expect(config.state.status).toBe('disconnected')
  })

  it('lets a wallet the user connected restore its session', () => {
    const config = makeConfig()
    guardWalletInitiatedConnects(config)
    setConnected([config.connectors[0].id])

    walletAnnouncesAccount(config.connectors[0])

    expect(config.state.status).toBe('connected')
  })

  it('guards wallets that announce after the config is created', () => {
    const config = makeConfig()
    guardWalletInitiatedConnects(config)

    const late = config._internal.connectors.setup(injected({ target: 'rabby' }))
    config._internal.connectors.setState(connectors => [...connectors, late])

    walletAnnouncesAccount(late)

    expect(config.state.status).toBe('disconnected')
  })

  it('without the guard, reconnect connects any wallet that trusts the site', async () => {
    const config = makeTrustingConfig()
    await reconnect(config)
    expect(config.state.status).toBe('connected')
  })

  it('stops reconnect connecting a wallet the user never connected, as AppKit does with no records', async () => {
    const config = makeTrustingConfig()
    guardWalletInitiatedConnects(config)

    await reconnect(config, { connectors: [] })

    expect(config.state.status).toBe('disconnected')
  })

  it('stops reconnect restoring a wallet the user disconnected', async () => {
    const config = makeTrustingConfig()
    guardWalletInitiatedConnects(config)
    setConnected(['io.rabby'])
    setDisconnected(['io.rabby'])

    await reconnect(config)

    expect(config.state.status).toBe('disconnected')
  })

  it('lets reconnect restore a wallet the user connected', async () => {
    const config = makeTrustingConfig()
    guardWalletInitiatedConnects(config)
    setConnected(['io.rabby'])

    await reconnect(config)

    expect(config.state.status).toBe('connected')
  })

  it('stops reconnect when the AppKit records are unreadable', async () => {
    const config = makeTrustingConfig()
    guardWalletInitiatedConnects(config)
    window.localStorage.setItem('@appkit/connections', '{not json')

    await reconnect(config)

    expect(config.state.status).toBe('disconnected')
  })
})
