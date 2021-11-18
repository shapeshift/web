declare module 'metamask-inpage-provider' {
  import type PostMessageStream from 'post-message-stream'

  export function initProvider({
    connectionStream,
    maxEventListeners = 100,
    preventPropertyDeletion = true,
    shouldSendMetadata = true,
    shouldSetOnWindow = true
  }: {
    connectionStream: PostMessageStream
    maxEventListeners?: number
    preventPropertyDeletion?: boolean
    shouldSendMetadata?: boolean
    shouldSetOnWindow?: boolean
  }): unknown
}
