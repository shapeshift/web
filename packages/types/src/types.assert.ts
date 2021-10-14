import * as ta from 'type-assertions'
import { ChainTypes, Transaction } from './types'

// unit tests for types

// a generic transaction should have details.nonce of string | undefined
// ta.assert<ta.Equal<Transaction['details']['nonce'], string | undefined>>()

// // a generic transaction should have details.opReturn of string | undefined
// ta.assert<ta.Equal<Transaction['details']['opReturn'], string | undefined>>()

// // an ethereum transaction should have details.nonce of string
// ta.assert<ta.Equal<Transaction<ChainTypes.Ethereum>['details']['nonce'], string>>()

// // an ethereum transaction should have details.opReturn of undefined
// ta.assert<ta.Equal<Transaction<ChainTypes.Ethereum>['details']['opReturn'], undefined>>()

// // a bitcoin transaction should have details.nonce of undefined
// ta.assert<ta.Equal<Transaction<ChainTypes.Bitcoin>['details']['nonce'], undefined>>()

// // a bitcoin transaction should have details.opReturn of string
// ta.assert<ta.Equal<Transaction<ChainTypes.Bitcoin>['details']['opReturn'], string>>()
