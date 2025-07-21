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

module.exports = {
  beaconAbi,
  oracleAbi,
  swapAbi,
  erc20Abi,
  arbGasInfoAbi,
  registerAbi,
  arbSysAbi,
};
