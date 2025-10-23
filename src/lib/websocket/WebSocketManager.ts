import type { WebSocketConfig, WebSocketEventHandler } from './WebSocketService'
import { WebSocketConnectionState, WebSocketService } from './WebSocketService'

export enum WebSocketServiceType {
  Swaps = 'swaps',
  Notifications = 'notifications',
}

type ServiceConfig = {
  serverUrl: string
  enabled: boolean
}

type WebSocketManagerConfig = {
  userId: string
  services: Record<WebSocketServiceType, ServiceConfig>
  reconnectionAttempts?: number
  reconnectionDelay?: number
  timeout?: number
}

export class WebSocketManager {
  private static instance: WebSocketManager | null = null
  private services: Map<WebSocketServiceType, WebSocketService> = new Map()
  private config: WebSocketManagerConfig
  private userId: string

  private constructor(config: WebSocketManagerConfig) {
    this.config = config
    this.userId = config.userId
  }

  static getInstance(config: WebSocketManagerConfig): WebSocketManager {
    if (!WebSocketManager.instance) {
      WebSocketManager.instance = new WebSocketManager(config)
    } else {
      // Update userId if it changed
      WebSocketManager.instance.userId = config.userId
    }
    return WebSocketManager.instance
  }

  static resetInstance(): void {
    if (WebSocketManager.instance) {
      WebSocketManager.instance.disconnectAll()
      WebSocketManager.instance = null
    }
  }

  private getServiceConfig(serviceType: WebSocketServiceType): WebSocketConfig {
    const serviceConfig = this.config.services[serviceType]

    // If serverUrl is a relative path (starts with /), it will use current origin
    // This works with Vite's proxy in development
    const serverUrl = serviceConfig.serverUrl

    return {
      serverUrl,
      userId: this.userId,
      reconnectionAttempts: this.config.reconnectionAttempts,
      reconnectionDelay: this.config.reconnectionDelay,
      timeout: this.config.timeout,
    }
  }

  async connect(serviceType: WebSocketServiceType): Promise<void> {
    const serviceConfig = this.config.services[serviceType]

    if (!serviceConfig.enabled) {
      throw new Error(`Service ${serviceType} is not enabled`)
    }

    if (!serviceConfig.serverUrl) {
      throw new Error(`Service ${serviceType} has no server URL configured`)
    }

    const existingService = this.services.get(serviceType)
    if (existingService?.isConnected()) {
      return
    }

    const config = this.getServiceConfig(serviceType)
    const service = new WebSocketService(config)
    console.log({ service })

    await service.connect()
    this.services.set(serviceType, service)
  }

  disconnect(serviceType: WebSocketServiceType): void {
    const service = this.services.get(serviceType)
    if (service) {
      service.disconnect()
      this.services.delete(serviceType)
    }
  }

  disconnectAll(): void {
    this.services.forEach(service => service.disconnect())
    this.services.clear()
  }

  async reconnect(serviceType: WebSocketServiceType): Promise<void> {
    this.disconnect(serviceType)
    await this.connect(serviceType)
  }

  on(serviceType: WebSocketServiceType, event: string, handler: WebSocketEventHandler): () => void {
    const service = this.services.get(serviceType)
    if (!service) {
      throw new Error(`Service ${serviceType} is not connected`)
    }
    return service.on(event, handler)
  }

  off(serviceType: WebSocketServiceType, event: string, handler?: WebSocketEventHandler): void {
    const service = this.services.get(serviceType)
    if (service) {
      service.off(event, handler)
    }
  }

  emit(serviceType: WebSocketServiceType, event: string, data: unknown): void {
    const service = this.services.get(serviceType)
    if (!service) {
      throw new Error(`Service ${serviceType} is not connected`)
    }
    service.emit(event, data)
  }

  isConnected(serviceType: WebSocketServiceType): boolean {
    const service = this.services.get(serviceType)
    return service?.isConnected() ?? false
  }

  getConnectionState(serviceType: WebSocketServiceType): WebSocketConnectionState {
    const service = this.services.get(serviceType)
    return service?.getConnectionState() ?? WebSocketConnectionState.Disconnected
  }

  getConnectedServices(): WebSocketServiceType[] {
    const connected: WebSocketServiceType[] = []
    this.services.forEach((service, type) => {
      if (service.isConnected()) {
        connected.push(type)
      }
    })
    return connected
  }

  isServiceEnabled(serviceType: WebSocketServiceType): boolean {
    return this.config.services[serviceType]?.enabled ?? false
  }
}
