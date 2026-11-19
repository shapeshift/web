import { watchConnectors } from '@wagmi/core'
import type { Config, Connector } from 'wagmi'

// Mirrors AppKit's HelpersUtil.getConnectorStorageInfo, read directly so hosts don't need @reown/appkit-utils
const APPKIT_CONNECTIONS_KEY = '@appkit/connections'
const APPKIT_DISCONNECTED_CONNECTOR_IDS_KEY = '@appkit/disconnected_connector_ids'
const EVM_NAMESPACE = 'eip155'

const readEvmEntries = (key: string): unknown[] => {
  const raw = window.localStorage.getItem(key)
  if (!raw) return []
  const entries = JSON.parse(raw)?.[EVM_NAMESPACE]
  return Array.isArray(entries) ? entries : []
}

// True only for a wallet the user connected through AppKit and hasn't disconnected since
const isUserConnectedConnector = (connectorId: string): boolean => {
  const isId = (value: unknown) =>
    typeof value === 'string' && value.toLowerCase() === connectorId.toLowerCase()

  try {
    return (
      !readEvmEntries(APPKIT_DISCONNECTED_CONNECTOR_IDS_KEY).some(isId) &&
      readEvmEntries(APPKIT_CONNECTIONS_KEY).some(entry =>
        isId((entry as { connectorId?: unknown } | null)?.connectorId),
      )
    )
  } catch {
    return false
  }
}

const guardedConnectors = new WeakSet<Connector>()

// Blocks a trusting wallet's own connect event and reconnect unless the user connected it via AppKit
const guardConnector = (connector: Connector) => {
  if (connector.type !== 'injected' || guardedConnectors.has(connector)) return
  guardedConnectors.add(connector)

  const isAuthorized = connector.isAuthorized.bind(connector)
  connector.isAuthorized = () =>
    isUserConnectedConnector(connector.id) ? isAuthorized() : Promise.resolve(false)

  const { emitter } = connector
  const emit = emitter.emit.bind(emitter)

  emitter.emit = ((eventName, ...params) => {
    if (eventName === 'connect' && !isUserConnectedConnector(connector.id)) return
    emit(eventName, ...params)
  }) as typeof emitter.emit
}

export const guardWalletInitiatedConnects = (config: Config) => {
  config.connectors.forEach(guardConnector)

  // EIP-6963 wallets can announce after the config is created
  watchConnectors(config, { onChange: connectors => connectors.forEach(guardConnector) })
}
