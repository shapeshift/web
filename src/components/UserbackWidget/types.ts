export type UserbackInstance = {
  access_token?: string
  on_load?: () => void
  open?: (feedbackType?: string, destination?: string) => void
  show?: () => void
  hide?: () => void
}

declare global {
  interface Window {
    Userback?: UserbackInstance
  }
}
