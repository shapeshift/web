import type { Socket } from 'socket.io-client'
import { io } from 'socket.io-client'

export enum WebSocketConnectionState {
  Disconnected = 'disconnected',
  Connecting = 'connecting',
  Connected = 'connected',
  Error = 'error',
}

export type WebSocketConfig = {
  serverUrl: string
  userId: string
  reconnectionAttempts?: number
  reconnectionDelay?: number
  timeout?: number
}

export type WebSocketEventHandler = (...args: unknown[]) => void

export class WebSocketError extends Error {
  code?: string

  constructor(message: string, code?: string) {
    super(message)
    this.name = 'WebSocketError'
    this.code = code
  }
}

export class WebSocketService {
  private socket: Socket | null = null
  private config: WebSocketConfig
  private connectionState: WebSocketConnectionState = WebSocketConnectionState.Disconnected

  constructor(config: WebSocketConfig) {
    this.config = {
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
      timeout: 10000,
      ...config,
    }
  }

  connect(): Promise<Socket> {
    console.log({ thisSocket: this.socket, config: this.config })
    if (this.socket?.connected) {
      return Promise.resolve(this.socket)
    }

    this.connectionState = WebSocketConnectionState.Connecting

    return new Promise((resolve, reject) => {
      const socket = io(this.config.serverUrl, {
        autoConnect: false,
        reconnection: true,
        reconnectionAttempts: this.config.reconnectionAttempts,
        reconnectionDelay: this.config.reconnectionDelay,
      })

      const authenticate = (): Promise<void> => {
        return new Promise((resolveAuth, rejectAuth) => {
          socket.emit('authenticate', { userId: this.config.userId }, (response: unknown) => {
            const typedResponse = response as { success?: boolean; error?: string }

            console.log({ typedResponse })

            if (typedResponse?.success) {
              this.connectionState = WebSocketConnectionState.Connected
              resolveAuth()
            } else {
              const error = new WebSocketError(
                typedResponse?.error || 'Authentication failed',
                'AUTH_FAILED',
              )
              this.connectionState = WebSocketConnectionState.Error
              rejectAuth(error)
            }
          })
        })
      }

      const timeout = setTimeout(() => {
        console.log('timeout')
        socket.close()
        this.connectionState = WebSocketConnectionState.Error
        reject(new WebSocketError('Connection timeout', 'TIMEOUT'))
      }, this.config.timeout)

      socket.on('connect', () => {
        console.log('Socket connected, clearing timeout')
        clearTimeout(timeout)

        authenticate()
          .then(() => {
            this.socket = socket
            resolve(socket)
          })
          .catch(error => {
            console.error('Authentication failed:', error)
            socket.close()
            reject(error)
          })
      })

      socket.connect()

      // Handle automatic reconnections - re-authenticate after reconnect
      socket.io.on('reconnect', () => {
        this.connectionState = WebSocketConnectionState.Connected
        authenticate().catch(error => {
          console.error('Re-authentication failed after reconnect:', error)
          socket.close()
        })
      })

      socket.io.on('reconnect_attempt', () => {
        this.connectionState = WebSocketConnectionState.Connecting
      })

      socket.io.on('reconnect_failed', () => {
        this.connectionState = WebSocketConnectionState.Error
      })

      socket.on('connect_error', error => {
        console.error('Socket connection error:', error)
        clearTimeout(timeout)
        this.connectionState = WebSocketConnectionState.Error
        reject(new WebSocketError(`Connection error: ${error.message}`, 'CONNECT_ERROR'))
      })

      socket.on('error', error => {
        console.error('Socket error:', error)
      })

      socket.on('disconnect', reason => {
        this.connectionState = WebSocketConnectionState.Disconnected

        // Handle scenarios where Socket.IO won't auto-reconnect
        if (reason === 'io server disconnect') {
          // Server forcibly disconnected, attempt manual reconnect
          socket.connect()
        }
      })
    })
  }

  disconnect(): void {
    if (this.socket) {
      this.socket.close()
      this.socket = null
      this.connectionState = WebSocketConnectionState.Disconnected
    }
  }

  on(event: string, handler: WebSocketEventHandler): () => void {
    if (!this.socket) {
      throw new WebSocketError('Socket is not connected', 'NOT_CONNECTED')
    }

    this.socket.on(event, handler)

    // Return cleanup function
    return () => {
      this.socket?.off(event, handler)
    }
  }

  off(event: string, handler?: WebSocketEventHandler): void {
    if (this.socket) {
      if (handler) {
        this.socket.off(event, handler)
      } else {
        this.socket.off(event)
      }
    }
  }

  emit(event: string, data: unknown): void {
    if (!this.socket?.connected) {
      throw new WebSocketError('Cannot emit: Socket is not connected', 'NOT_CONNECTED')
    }

    this.socket.emit(event, data)
  }

  isConnected(): boolean {
    return this.socket?.connected ?? false
  }

  getConnectionState(): WebSocketConnectionState {
    return this.connectionState
  }

  getSocket(): Socket | null {
    return this.socket
  }
}
