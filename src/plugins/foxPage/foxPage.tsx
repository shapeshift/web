import { useState } from 'react'
import { RawText } from 'components/Text'

export enum FoxPageTab {
  Fox = 'Fox',
  Foxy = 'Foxy',
}

export type FoxPageProps = {
  initialTab?: FoxPageTab
}

export const FoxPage = (props: FoxPageProps) => {
  const [tab] = useState(props.initialTab ?? FoxPageTab.Fox)

  return <RawText>TODO Fox Page // current Tab : {tab}</RawText>
}
