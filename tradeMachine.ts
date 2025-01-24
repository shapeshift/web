import { createMachine } from 'xstate'

export const tradeMachine = createMachine({
  id: 'trade',
  initial: 'gettingQuote',
  context: {
    sellAsset: undefined,
    buyAsset: undefined,
    sellAmountCryptoPrecision: '0',
    buyAmountCryptoPrecision: '0',
    sellAccountId: undefined,
    buyAccountId: undefined,
    isInputtingFiatSellAmount: false,
    manualReceiveAddress: undefined,
    slippagePreferencePercentage: undefined,
    activeQuoteMeta: undefined,
    confirmedQuote: undefined,
    tradeExecution: {},
    tradeQuotes: {},
    isTradeQuoteRequestAborted: false,
  },
  states: {
    gettingQuote: {
      initial: 'idle',
      states: {
        idle: {
          on: {
            SET_SELL_ASSET: {
              actions: ['setSellAsset', 'setSellAccountId'],
            },
            SET_BUY_ASSET: {
              actions: ['setBuyAsset', 'setBuyAccountId'],
            },
            SET_SELL_AMOUNT: {
              target: 'inputting',
              actions: 'setSellAmountCryptoPrecision',
            },
          },
        },
        inputting: {
          on: {
            SET_SELL_AMOUNT: {
              actions: 'setSellAmountCryptoPrecision',
            },
            TOGGLE_FIAT_SELL_AMOUNT: {
              actions: 'toggleIsInputtingFiatSellAmount',
            },
            SET_MANUAL_ADDRESS: {
              actions: 'setManualReceiveAddress',
            },
            SET_SLIPPAGE: {
              actions: 'setSlippagePreferencePercentage',
            },
            FETCH_QUOTES: {
              target: 'fetchingQuotes',
              actions: 'clearTradeQuotes',
            },
          },
        },
        fetchingQuotes: {
          entry: 'setTradeQuoteRequestPending',
          on: {
            UPSERT_TRADE_QUOTES: {
              actions: 'upsertTradeQuotes',
            },
            SET_ACTIVE_QUOTE: {
              target: 'displayingQuotes',
              actions: 'setActiveQuote',
            },
            ABORT_TRADE_QUOTE: {
              actions: 'setIsTradeQuoteRequestAborted',
            },
          },
        },
        displayingQuotes: {
          on: {
            CONFIRM_QUOTE: {
              target: '#trade.executingTrade',
              actions: ['setConfirmedQuote', 'setTradeExecutionState'],
            },
            CLEAR_QUOTES: {
              actions: 'clearTradeQuotes',
              target: 'inputting',
            },
          },
        },
      },
    },
    executingTrade: {
      initial: 'checkingApprovals',
      states: {
        checkingApprovals: {
          on: {
            SET_TRADE_INITIALIZED: {
              target: 'awaitingApproval',
              actions: 'setTradeInitialized',
            },
          },
        },
        awaitingApproval: {
          states: {
            allowanceReset: {
              on: {
                SET_ALLOWANCE_RESET: {
                  actions: 'setAllowanceReset',
                },
              },
            },
            allowanceApproval: {
              on: {
                SET_ALLOWANCE_APPROVAL: {
                  actions: 'setAllowanceApproval',
                },
              },
            },
            permit2: {
              on: {
                SET_PERMIT2_SIGNATURE: {
                  actions: 'setPermit2Signature',
                  target: '#trade.executingTrade.readyToTrade',
                },
              },
            },
          },
        },
        readyToTrade: {
          on: {
            EXECUTE_TRADE: {
              target: 'executing',
              actions: 'setTradeExecuting',
            },
          },
        },
        executing: {
          states: {
            firstHop: {
              on: {
                SET_FIRST_HOP_COMPLETE: {
                  target: 'secondHop',
                  actions: 'setFirstHopComplete',
                },
              },
            },
            secondHop: {
              on: {
                SET_SECOND_HOP_COMPLETE: {
                  target: '#trade.tradeComplete',
                  actions: 'setSecondHopComplete',
                },
              },
            },
          },
        },
      },
    },
    tradeComplete: {
      type: 'final',
      entry: 'clearTradeState',
    },
    error: {
      on: {
        RETRY: '#trade.gettingQuote.fetchingQuotes',
        CLEAR_ERROR: {
          target: '#trade.gettingQuote.inputting',
          actions: 'clearError',
        },
      },
    },
  },
}) 