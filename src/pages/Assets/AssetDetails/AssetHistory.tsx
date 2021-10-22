import { useTranslate } from 'react-polyglot'
import { useSelector } from 'react-redux'
import { Card } from 'components/Card/Card'
import { Transactions } from 'components/Transactions/Transactions'
import { AssetMarketData } from 'hooks/useAsset/useAsset'
import { ReduxState } from 'state/reducer'

import { selectTxHistoryById } from '../helpers/selectTxHistoryById/selectTxHistoryById'

export const AssetHistory = ({ asset }: { asset: AssetMarketData }) => {
  const translate = useTranslate()
  const { chain, tokenId } = asset
  const txs = useSelector((state: ReduxState) =>
    selectTxHistoryById(state, chain ?? '', tokenId ?? chain)
  )
  return (
    <Card>
      <Card.Header>
        <Card.Heading>
          {translate('assets.assetDetails.assetHistory.transactionHistory')}
        </Card.Heading>
      </Card.Header>
      <Card.Body px={2} pt={0}>
        <Transactions txs={txs} />
      </Card.Body>
    </Card>
  )
}
