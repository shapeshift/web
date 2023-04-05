import type { V2NftCollectionType } from 'state/apis/zapper/client'

type NftCollectionProps = {
  zapperCollection?: V2NftCollectionType[]
}

export const NftCollection: React.FC<NftCollectionProps> = ({ zapperCollection }) => {
  return <div>collection tab content</div>
}
