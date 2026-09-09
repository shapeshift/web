// Only vars read directly off `import.meta.env` belong here. Everything else is validated and
// typed by the envalid schema in src/config.ts and must be read through `getConfig()`.
interface ImportMetaEnv {
  readonly VITE_ENABLE_HYPELAB: string
  readonly VITE_HYPELAB_PROPERTY_SLUG: string
  readonly VITE_FEATURE_CHATWOOT: string
  readonly VITE_FEATURE_MIXPANEL: string
  readonly VITE_PUBLIC_API_URL: string
  readonly VITE_USER_SERVER_URL: string

  // Only present in *some* envs
  readonly VITE_MIXPANEL_TOKEN?: string

  // Injected by CI at build time
  readonly VITE_VERSION?: string

  // Local development only - enables Sentry on localhost
  readonly VITE_ENABLE_SENTRY_LOCALHOST?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
