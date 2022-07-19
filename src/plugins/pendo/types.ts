export type PendoLauncher = {
  arm(): void
  launch(idPrefix?: string): void
  get transmissionLog(): Record<string, unknown>[]
}
