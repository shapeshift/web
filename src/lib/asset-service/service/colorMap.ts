import map from './color-map.json'

// Record<AssetId, string> but we can't use nominals as indexers, only primitives
export const colorMap: Record<string, string> = map
