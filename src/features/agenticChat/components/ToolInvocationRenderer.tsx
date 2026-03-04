import { getToolOrDynamicToolName } from 'ai'
import type { ComponentType } from 'react'
import { memo } from 'react'

import type { ToolName, ToolRendererProps, ToolUIProps } from '../types/toolInvocation'
import { CancelLimitOrderUI } from './tools/CancelLimitOrderUI'
import { CreateLimitOrderUI } from './tools/CreateLimitOrderUI'
import { GetAssetsUI } from './tools/GetAssetsUI'
import { GetLimitOrdersUI } from './tools/GetLimitOrdersUI'
import { GetTransactionHistoryUI } from './tools/GetTransactionHistoryUI'
import { NewCoinsUI } from './tools/NewCoinsUI'
import { ReceiveUI } from './tools/ReceiveUI'
import { SendUI } from './tools/SendUI'
import { SwapUI } from './tools/SwapUI'
import { TopGainersLosersUI } from './tools/TopGainersLosersUI'
import { TrendingTokensUI } from './tools/TrendingTokensUI'

type ToolUIComponentMap = {
  [K in ToolName]: ComponentType<ToolUIProps<K>> | null
}

const TOOL_UI_MAP: ToolUIComponentMap = {
  sendTool: SendUI,
  initiateSwapTool: SwapUI,
  initiateSwapUsdTool: SwapUI,
  cancelLimitOrderTool: CancelLimitOrderUI,
  createLimitOrderTool: CreateLimitOrderUI,
  getLimitOrdersTool: GetLimitOrdersUI,
  mathCalculatorTool: null,
  getAssetsTool: GetAssetsUI,
  transactionHistoryTool: GetTransactionHistoryUI,
  getNewCoinsTool: NewCoinsUI,
  receiveTool: ReceiveUI,
  getTopGainersLosersTool: TopGainersLosersUI,
  getTrendingTokensTool: TrendingTokensUI,
}

export const ToolInvocationRenderer = memo(({ toolPart }: ToolRendererProps) => {
  const toolName = getToolOrDynamicToolName(toolPart) as ToolName
  const ToolComponent = TOOL_UI_MAP[toolName] as ComponentType<ToolRendererProps> | null | undefined

  if (ToolComponent === null || ToolComponent === undefined) {
    return null
  }

  return <ToolComponent toolPart={toolPart} />
})

ToolInvocationRenderer.displayName = 'ToolInvocationRenderer'
