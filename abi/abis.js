const beaconAbi = [
  "function freeMoneyLight() external",
  "event SettlementBatch(uint256 reportsSettled, uint256 totalRewards, address indexed settler)",
  "event ReportSettled(uint256 indexed reportId, uint256 reward, address indexed settler)",
];

const oracleAbi = [
  "event ReportInstanceCreated(uint256 indexed reportId, address indexed token1Address, address indexed token2Address, uint256 feePercentage, uint256 multiplier, uint256 exactToken1Report, uint256 ethFee, address creator, uint256 settlementTime, uint256 escalationHalt, uint256 disputeDelay, uint256 protocolFee, uint256 settlerReward, bool timeType, address callbackContract, bytes4 callbackSelector, bool trackDisputes, uint256 callbackGasLimit, bool keepFee, bytes32 stateHash)",
  "event InitialReportSubmitted(uint256 indexed reportId, address reporter, uint256 amount1, uint256 amount2, address indexed token1Address, address indexed token2Address, uint256 swapFee, uint256 protocolFee, uint256 settlementTime, uint256 disputeDelay, uint256 escalationHalt, bool timeType, address callbackContract, bytes4 callbackSelector, bool trackDisputes, uint256 callbackGasLimit, bytes32 stateHash)",
  "event ReportDisputed(uint256 indexed reportId, address disputer, uint256 newAmount1, uint256 newAmount2, address indexed token1Address, address indexed token2Address, uint256 swapFee, uint256 protocolFee, uint256 settlementTime, uint256 disputeDelay, uint256 escalationHalt, bool timeType, address callbackContract, bytes4 callbackSelector, bool trackDisputes, uint256 callbackGasLimit, bytes32 stateHash)",
  "function reportMeta(uint256) view returns (address token1, address token2, uint256 feePercentage, uint256 multiplier, uint256 settlementTime, uint256 exactToken1Report, uint256 fee, uint256 escalationHalt, uint256 disputeDelay, uint256 protocolFee, uint256 settlerReward, uint256 requestBlock, bool timeType)",
  "function reportStatus(uint256) view returns (uint256 currentAmount1, uint256 currentAmount2, address payable currentReporter, address payable initialReporter, uint256 reportTimestamp, uint256 settlementTimestamp, uint256 price, uint256 lastDisputeBlock, bool isSettled, bool disputeOccurred, bool isDistributed, uint256 initialReportTimestamp, uint256 lastReportTrueTime)",
  "function extraData(uint256) view returns (address creator, uint256 requestTrueTime, address callbackContract, bytes4 callbackSelector, bool trackDisputes, uint256 numReports, uint256 callbackGasLimit, bool keepFee, bytes32 stateHash)",
  "function nextReportId() view returns (uint256)",
  "function submitInitialReport(uint256 reportId, uint256 amount1, uint256 amount2, bytes32 stateHash) external",
  "function disputeAndSwap(uint256 reportId, address tokenToSwap, uint256 newAmount1, uint256 newAmount2, uint256 amt2Expected, bytes32 stateHash) external",
];

const swapAbi = [
  "function createAndReport(address token1, address token2, uint256 amount1, uint256 amount2, uint256 fee, uint256 settlementTime) external payable returns (uint256)",
  "event SwapReportOpened(uint256 indexed reportId, address indexed user, address indexed tokenIn, address tokenOut, uint256 amountIn, uint256 amountOut, uint256 feePaidWei)",
];

const erc20Abi = [
  "function approve(address spender, uint256 amount) external returns (bool)",
  "function allowance(address owner, address spender) external view returns (uint256)",
  "function balanceOf(address account) external view returns (uint256)",
];

const arbGasInfoAbi = [
  "function getCurrentTxL1GasFees() view returns (uint256)",
];

const registerAbi = ["function register(address)"];

const arbSysAbi = ["function arbBlockNumber() view returns (uint256)"];


const batcherAbi = [
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "oracleAddress",
        "type": "address"
      }
    ],
    "stateMutability": "nonpayable",
    "type": "constructor"
  },
  {
    "inputs": [],
    "name": "EthTransferFailed",
    "type": "error"
  },
  {
    "inputs": [],
    "name": "ReentrancyGuardReentrantCall",
    "type": "error"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "token",
        "type": "address"
      }
    ],
    "name": "SafeERC20FailedOperation",
    "type": "error"
  },
  {
    "inputs": [
      {
        "components": [
          {
            "internalType": "uint256",
            "name": "reportId",
            "type": "uint256"
          },
          {
            "internalType": "address",
            "name": "tokenToSwap",
            "type": "address"
          },
          {
            "internalType": "uint256",
            "name": "newAmount1",
            "type": "uint256"
          },
          {
            "internalType": "uint256",
            "name": "newAmount2",
            "type": "uint256"
          },
          {
            "internalType": "uint256",
            "name": "amt2Expected",
            "type": "uint256"
          },
          {
            "internalType": "bytes32",
            "name": "stateHash",
            "type": "bytes32"
          }
        ],
        "internalType": "struct openOracleBatcher.DisputeData[]",
        "name": "disputes",
        "type": "tuple[]"
      },
      {
        "internalType": "uint256",
        "name": "batchAmount1",
        "type": "uint256"
      },
      {
        "internalType": "uint256",
        "name": "batchAmount2",
        "type": "uint256"
      }
    ],
    "name": "disputeReports",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "oracle",
    "outputs": [
      {
        "internalType": "contract IOpenOracle",
        "name": "",
        "type": "address"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "components": [
          {
            "internalType": "address",
            "name": "token1Address",
            "type": "address"
          },
          {
            "internalType": "address",
            "name": "token2Address",
            "type": "address"
          },
          {
            "internalType": "uint256",
            "name": "exactToken1Report",
            "type": "uint256"
          },
          {
            "internalType": "uint256",
            "name": "feePercentage",
            "type": "uint256"
          },
          {
            "internalType": "uint256",
            "name": "multiplier",
            "type": "uint256"
          },
          {
            "internalType": "uint256",
            "name": "settlementTime",
            "type": "uint256"
          },
          {
            "internalType": "uint256",
            "name": "escalationHalt",
            "type": "uint256"
          },
          {
            "internalType": "uint256",
            "name": "disputeDelay",
            "type": "uint256"
          },
          {
            "internalType": "uint256",
            "name": "protocolFee",
            "type": "uint256"
          },
          {
            "internalType": "uint256",
            "name": "settlerReward",
            "type": "uint256"
          },
          {
            "internalType": "bool",
            "name": "timeType",
            "type": "bool"
          },
          {
            "internalType": "address",
            "name": "callbackContract",
            "type": "address"
          },
          {
            "internalType": "bytes4",
            "name": "callbackSelector",
            "type": "bytes4"
          },
          {
            "internalType": "bool",
            "name": "trackDisputes",
            "type": "bool"
          },
          {
            "internalType": "uint256",
            "name": "callbackGasLimit",
            "type": "uint256"
          },
          {
            "internalType": "bool",
            "name": "keepFee",
            "type": "bool"
          }
        ],
        "internalType": "struct openOracleBatcher.priceRequestData[]",
        "name": "priceRequests",
        "type": "tuple[]"
      }
    ],
    "name": "requestPrices",
    "outputs": [],
    "stateMutability": "payable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "components": [
          {
            "internalType": "uint256",
            "name": "reportId",
            "type": "uint256"
          },
          {
            "internalType": "bytes32",
            "name": "stateHash",
            "type": "bytes32"
          }
        ],
        "internalType": "struct openOracleBatcher.SafeSettleData[]",
        "name": "settles",
        "type": "tuple[]"
      }
    ],
    "name": "safeSettleReports",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "components": [
          {
            "internalType": "uint256",
            "name": "reportId",
            "type": "uint256"
          }
        ],
        "internalType": "struct openOracleBatcher.SettleData[]",
        "name": "settles",
        "type": "tuple[]"
      }
    ],
    "name": "settleReports",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "components": [
          {
            "internalType": "uint256",
            "name": "reportId",
            "type": "uint256"
          },
          {
            "internalType": "uint256",
            "name": "amount1",
            "type": "uint256"
          },
          {
            "internalType": "uint256",
            "name": "amount2",
            "type": "uint256"
          },
          {
            "internalType": "bytes32",
            "name": "stateHash",
            "type": "bytes32"
          }
        ],
        "internalType": "struct openOracleBatcher.InitialReportData[]",
        "name": "reports",
        "type": "tuple[]"
      },
      {
        "internalType": "uint256",
        "name": "batchAmount1",
        "type": "uint256"
      },
      {
        "internalType": "uint256",
        "name": "batchAmount2",
        "type": "uint256"
      }
    ],
    "name": "submitInitialReports",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "stateMutability": "payable",
    "type": "receive"
  }
];

const dataProviderAbi = [
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "oracleAddress",
        "type": "address"
      }
    ],
    "stateMutability": "nonpayable",
    "type": "constructor"
  },
  {
    "inputs": [],
    "name": "getData",
    "outputs": [
      {
        "components": [
          {
            "internalType": "uint256",
            "name": "reportId",
            "type": "uint256"
          },
          {
            "internalType": "address",
            "name": "token1",
            "type": "address"
          },
          {
            "internalType": "address",
            "name": "token2",
            "type": "address"
          },
          {
            "internalType": "uint256",
            "name": "feePercentage",
            "type": "uint256"
          },
          {
            "internalType": "uint256",
            "name": "multiplier",
            "type": "uint256"
          },
          {
            "internalType": "uint256",
            "name": "settlementTime",
            "type": "uint256"
          },
          {
            "internalType": "uint256",
            "name": "exactToken1Report",
            "type": "uint256"
          },
          {
            "internalType": "uint256",
            "name": "fee",
            "type": "uint256"
          },
          {
            "internalType": "uint256",
            "name": "escalationHalt",
            "type": "uint256"
          },
          {
            "internalType": "uint256",
            "name": "disputeDelay",
            "type": "uint256"
          },
          {
            "internalType": "uint256",
            "name": "protocolFee",
            "type": "uint256"
          },
          {
            "internalType": "uint256",
            "name": "settlerReward",
            "type": "uint256"
          },
          {
            "internalType": "uint256",
            "name": "requestBlock",
            "type": "uint256"
          },
          {
            "internalType": "bool",
            "name": "timeType",
            "type": "bool"
          },
          {
            "internalType": "uint256",
            "name": "currentAmount1",
            "type": "uint256"
          },
          {
            "internalType": "uint256",
            "name": "currentAmount2",
            "type": "uint256"
          },
          {
            "internalType": "address payable",
            "name": "currentReporter",
            "type": "address"
          },
          {
            "internalType": "address payable",
            "name": "initialReporter",
            "type": "address"
          },
          {
            "internalType": "uint256",
            "name": "reportTimestamp",
            "type": "uint256"
          },
          {
            "internalType": "uint256",
            "name": "settlementTimestamp",
            "type": "uint256"
          },
          {
            "internalType": "uint256",
            "name": "price",
            "type": "uint256"
          },
          {
            "internalType": "uint256",
            "name": "lastDisputeBlock",
            "type": "uint256"
          },
          {
            "internalType": "bool",
            "name": "isSettled",
            "type": "bool"
          },
          {
            "internalType": "bool",
            "name": "disputeOccurred",
            "type": "bool"
          },
          {
            "internalType": "bool",
            "name": "isDistributed",
            "type": "bool"
          },
          {
            "internalType": "uint256",
            "name": "initialReportTimestamp",
            "type": "uint256"
          },
          {
            "internalType": "uint256",
            "name": "lastReportTrueTime",
            "type": "uint256"
          },
          {
            "internalType": "address",
            "name": "creator",
            "type": "address"
          },
          {
            "internalType": "uint256",
            "name": "requestTrueTime",
            "type": "uint256"
          },
          {
            "internalType": "address",
            "name": "callbackContract",
            "type": "address"
          },
          {
            "internalType": "bytes4",
            "name": "callbackSelector",
            "type": "bytes4"
          },
          {
            "internalType": "bool",
            "name": "trackDisputes",
            "type": "bool"
          },
          {
            "internalType": "uint256",
            "name": "numReports",
            "type": "uint256"
          },
          {
            "internalType": "uint256",
            "name": "callbackGasLimit",
            "type": "uint256"
          },
          {
            "internalType": "bool",
            "name": "keepFee",
            "type": "bool"
          },
          {
            "internalType": "bytes32",
            "name": "stateHash",
            "type": "bytes32"
          }
        ],
        "internalType": "struct openOracleDataProviderV2.botStruct[]",
        "name": "",
        "type": "tuple[]"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "uint256",
        "name": "startId",
        "type": "uint256"
      },
      {
        "internalType": "uint256",
        "name": "endId",
        "type": "uint256"
      }
    ],
    "name": "getData",
    "outputs": [
      {
        "components": [
          {
            "internalType": "uint256",
            "name": "reportId",
            "type": "uint256"
          },
          {
            "internalType": "address",
            "name": "token1",
            "type": "address"
          },
          {
            "internalType": "address",
            "name": "token2",
            "type": "address"
          },
          {
            "internalType": "uint256",
            "name": "feePercentage",
            "type": "uint256"
          },
          {
            "internalType": "uint256",
            "name": "multiplier",
            "type": "uint256"
          },
          {
            "internalType": "uint256",
            "name": "settlementTime",
            "type": "uint256"
          },
          {
            "internalType": "uint256",
            "name": "exactToken1Report",
            "type": "uint256"
          },
          {
            "internalType": "uint256",
            "name": "fee",
            "type": "uint256"
          },
          {
            "internalType": "uint256",
            "name": "escalationHalt",
            "type": "uint256"
          },
          {
            "internalType": "uint256",
            "name": "disputeDelay",
            "type": "uint256"
          },
          {
            "internalType": "uint256",
            "name": "protocolFee",
            "type": "uint256"
          },
          {
            "internalType": "uint256",
            "name": "settlerReward",
            "type": "uint256"
          },
          {
            "internalType": "uint256",
            "name": "requestBlock",
            "type": "uint256"
          },
          {
            "internalType": "bool",
            "name": "timeType",
            "type": "bool"
          },
          {
            "internalType": "uint256",
            "name": "currentAmount1",
            "type": "uint256"
          },
          {
            "internalType": "uint256",
            "name": "currentAmount2",
            "type": "uint256"
          },
          {
            "internalType": "address payable",
            "name": "currentReporter",
            "type": "address"
          },
          {
            "internalType": "address payable",
            "name": "initialReporter",
            "type": "address"
          },
          {
            "internalType": "uint256",
            "name": "reportTimestamp",
            "type": "uint256"
          },
          {
            "internalType": "uint256",
            "name": "settlementTimestamp",
            "type": "uint256"
          },
          {
            "internalType": "uint256",
            "name": "price",
            "type": "uint256"
          },
          {
            "internalType": "uint256",
            "name": "lastDisputeBlock",
            "type": "uint256"
          },
          {
            "internalType": "bool",
            "name": "isSettled",
            "type": "bool"
          },
          {
            "internalType": "bool",
            "name": "disputeOccurred",
            "type": "bool"
          },
          {
            "internalType": "bool",
            "name": "isDistributed",
            "type": "bool"
          },
          {
            "internalType": "uint256",
            "name": "initialReportTimestamp",
            "type": "uint256"
          },
          {
            "internalType": "uint256",
            "name": "lastReportTrueTime",
            "type": "uint256"
          },
          {
            "internalType": "address",
            "name": "creator",
            "type": "address"
          },
          {
            "internalType": "uint256",
            "name": "requestTrueTime",
            "type": "uint256"
          },
          {
            "internalType": "address",
            "name": "callbackContract",
            "type": "address"
          },
          {
            "internalType": "bytes4",
            "name": "callbackSelector",
            "type": "bytes4"
          },
          {
            "internalType": "bool",
            "name": "trackDisputes",
            "type": "bool"
          },
          {
            "internalType": "uint256",
            "name": "numReports",
            "type": "uint256"
          },
          {
            "internalType": "uint256",
            "name": "callbackGasLimit",
            "type": "uint256"
          },
          {
            "internalType": "bool",
            "name": "keepFee",
            "type": "bool"
          },
          {
            "internalType": "bytes32",
            "name": "stateHash",
            "type": "bytes32"
          }
        ],
        "internalType": "struct openOracleDataProviderV2.botStruct[]",
        "name": "",
        "type": "tuple[]"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "oracle",
    "outputs": [
      {
        "internalType": "contract IOpenOracle",
        "name": "",
        "type": "address"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "owner",
    "outputs": [
      {
        "internalType": "address",
        "name": "",
        "type": "address"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  }
];

module.exports = {
  beaconAbi,
  oracleAbi,
  swapAbi,
  erc20Abi,
  arbGasInfoAbi,
  registerAbi,
  arbSysAbi,
  dataProviderAbi,
  batcherAbi,
};
