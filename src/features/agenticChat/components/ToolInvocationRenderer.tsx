import { getToolOrDynamicToolName } from 'ai'
import type { ComponentType } from 'react'
import { memo } from 'react'

import type { ToolUIProps } from '../types/toolInvocation'
import { SendUI } from './tools/SendUI'
import { SwapUI } from './tools/SwapUI'
import { UnknownToolUI } from './UnknownToolUI'

const TOOL_UI_MAP: Record<string, ComponentType<ToolUIProps>> = {
  sendTool: SendUI,
  initiateSwapTool: SwapUI,
  initiateSwapUsdTool: SwapUI,
  // Additional tools will be added here as they are implemented
  // switchNetworkTool: NetworkSwitchUI,
  // createLimitOrderTool: LimitOrderUI,
  // cancelLimitOrderTool: CancelLimitOrderUI,
}

export const ToolInvocationRenderer = memo(({ toolPart }: ToolUIProps) => {
  const toolName = getToolOrDynamicToolName(toolPart)
  const ToolComponent = TOOL_UI_MAP[toolName]

  if (!ToolComponent) {
    return <UnknownToolUI toolPart={toolPart} />
  }

  return <ToolComponent toolPart={toolPart} />
})

ToolInvocationRenderer.displayName = 'ToolInvocationRenderer'
