import type { ToolsResponse } from '@lifi/types'

import { getLifi } from './getLifi'
import type { LifiTool } from './types'

export const getLifiToolsMap = async (): Promise<Map<string, LifiTool>> => {
  const toolsResponse: ToolsResponse = await getLifi().getTools()

  const result: Map<string, LifiTool> = new Map()

  for (const { key, name, logoURI } of toolsResponse.exchanges) {
    result.set(key, { key, name, logoURI })
  }

  for (const { key, name, logoURI } of toolsResponse.bridges) {
    result.set(key, { key, name, logoURI })
  }

  return result
}
