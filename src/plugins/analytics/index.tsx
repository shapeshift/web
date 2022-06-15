import { Plugins } from '../index'

export function register(): Plugins {
  return [['analytics', { name: 'Pendo Analytics' }]]
}
