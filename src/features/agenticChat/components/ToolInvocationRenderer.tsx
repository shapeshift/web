import { getToolOrDynamicToolName } from 'ai'
import type { ComponentType } from 'react'
import { memo } from 'react'

import type { ToolUIProps } from '../types/toolInvocation'
import { CancelLimitOrderUI } from './tools/CancelLimitOrderUI'
import { CreateLimitOrderUI } from './tools/CreateLimitOrderUI'
import { GetAssetsUI } from './tools/GetAssetsUI'
import { GetLimitOrdersUI } from './tools/GetLimitOrdersUI'
import { GetTransactionHistoryUI } from './tools/GetTransactionHistoryUI'
import { NewCoinsUI } from './tools/NewCoinsUI'
import { PortfolioUI } from './tools/PortfolioUI'
import { ReceiveUI } from './tools/ReceiveUI'
import { SendUI } from './tools/SendUI'
import { SwapUI } from './tools/SwapUI'
import { TopGainersLosersUI } from './tools/TopGainersLosersUI'
import { TrendingTokensUI } from './tools/TrendingTokensUI'

const TOOL_UI_MAP: Record<string, ComponentType<ToolUIProps> | null> = {
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
  portfolioTool: PortfolioUI,
  receiveTool: ReceiveUI,
  getTopGainersLosersTool: TopGainersLosersUI,
  getTrendingTokensTool: TrendingTokensUI,
}

export const ToolInvocationRenderer = memo(({ toolPart }: ToolUIProps) => {
  const toolName = getToolOrDynamicToolName(toolPart)
  const ToolComponent = TOOL_UI_MAP[toolName]

  if (ToolComponent === null || ToolComponent === undefined) {
    return null
  }

  return <ToolComponent toolPart={toolPart} />
})

ToolInvocationRenderer.displayName = 'ToolInvocationRenderer'
