import type { ChainId } from '@shapeshiftoss/caip'
import type { ChainAdapter } from '@shapeshiftoss/chain-adapters'
import type { Get, ReadonlyDeep, ValueOf } from 'type-fest'
import type { FeatureFlags } from 'state/slices/preferencesSlice/preferencesSlice'

import type { Route } from '../Routes/helpers'
import type { activePlugins } from './active_generated'

/**
 * We need plugins to be able to export (a register function that returns) a narrow (i.e. non-widened) type. The simplest
 * way to do this is for them to use "as const", but that will also turn the value Readonly and cause TypeScript to throw
 * a fit. As a workaround, we explicitly ask for the Readonly version here so plugins can use "as const".
 */
type PluginBase = ReadonlyDeep<{
  icon?: JSX.Element
  featureFlag?: keyof FeatureFlags
  providers?: {
    chainAdapters?: Partial<Record<ChainId, () => ChainAdapter<ChainId>>>
  }
  routes?: Route[]
}>
export type Plugin<T extends PluginBase = PluginBase> = T

export type RegistrablePlugin<T extends Plugin = Plugin> = { register: () => T }

/**
 * Given a union of RegistrablePlugin types, gets the union of the Plugin types created on registration.
 */
export type RegistrablePluginPluginType<T extends RegistrablePlugin<any>> =
  T extends RegistrablePlugin<infer R> ? R : never

/**
 * Given a union of Plugin types, gets the union of all the types of ChainAdapter they provide.
 */
export type PluginChainAdapter<T extends Plugin> = T extends unknown
  ? ReturnType<Extract<ValueOf<Get<T, 'providers.chainAdapters'>>, (...args: any) => any>>
  : never

/**
 * Given a union of Plugin types, gets the union of all the ChainIds they provide ChainAdapters for.
 */
export type PluginChainId<T extends Plugin> = T extends unknown
  ? keyof Get<T, 'providers.chainAdapters'>
  : never

/**
 * Union of the types of all active registrable plugins (i.e. `typeof import('./foo') | typeof import('./bar')`)
 */
export type ActiveRegistrablePlugin = ValueOf<typeof activePlugins>

/**
 * Union of all the possible types of Plugin you might get by calling register() on an active RegistrablePlugin
 */
export type ActivePlugin = ReturnType<ActiveRegistrablePlugin['register']>

/**
 * Given a ChainId, gets the specific Plugin which provides a matching ChainAdapter
 */
export type ActivePluginForChainId<T extends PluginChainId<ActivePlugin>> = Extract<
  ActivePlugin,
  { providers: { chainAdapters: Record<T, unknown> } }
>
