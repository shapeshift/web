// only export common cosmossdk swagger models generated from:
// https://github.com/shapeshift/unchained/blob/develop/go/pkg/cosmos/models.go
export type {
  CosmosSDKAccount as Account,
  Tx,
  CosmosSDKInfo as Info,
  Validator,
  Event,
  Message,
} from '../generated/cosmos'
