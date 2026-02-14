import type { DynamicToolUIPart, ToolUIPart, UITools } from 'ai'

import type { ToolOutputMap } from './toolOutput'

export type ToolPartBase = ToolUIPart<UITools> | DynamicToolUIPart

type TypedToolPart<T extends keyof ToolOutputMap> = Omit<ToolPartBase, 'output'> & {
  output?: ToolOutputMap[T] | undefined
}

export type ToolUIProps<T extends keyof ToolOutputMap = keyof ToolOutputMap> = {
  toolPart: TypedToolPart<T>
}

export type ToolRendererProps = {
  toolPart: ToolPartBase
}

export type ToolName = keyof ToolOutputMap
