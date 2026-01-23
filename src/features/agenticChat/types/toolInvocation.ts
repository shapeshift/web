import type { DynamicToolUIPart, ToolUIPart, UITools } from 'ai'

export type ToolUIProps = {
  toolPart: ToolUIPart<UITools> | DynamicToolUIPart
}
