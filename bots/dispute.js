require("dotenv").config();
const { ethers } = require("ethers");
const axios = require("axios");
const { oracleAbi, erc20Abi } = require("../abi/abis");

// Providers
const txProvider = new ethers.JsonRpcProvider(process.env.SEQUENCER_RPC_URL);
const queryProvider = new ethers.JsonRpcProvider(process.env.QUERY_RPC_URL);

// Wallet
const privateKey = process.env.VPS_PRIVATE_KEY;
if (!privateKey) {
  throw new Error("VPS_PRIVATE_KEY not set in .env");
}
const wallet = new ethers.Wallet(privateKey, queryProvider);
const executeWallet = new ethers.Wallet(privateKey, txProvider);

// Contracts
const oracleContract = new ethers.Contract(
  process.env.ORACLE_CONTRACT_ADDRESS,
  oracleAbi,
  wallet
);
const wethContract = new ethers.Contract(
  process.env.WETH_ADDRESS,
  erc20Abi,
  wallet
);
const usdcContract = new ethers.Contract(
  process.env.USDC_ADDRESS,
  erc20Abi,
  wallet
);

// Fetch real-time prices from CoinGecko
async function fetchCryptoPrices() {
  try {
    const response = await axios.get(
      "https://api.coingecko.com/api/v3/simple/price?ids=ethereum,usd-coin&vs_currencies=usd"
    );
    return {
      wethPriceUsd: response.data["ethereum"].usd,
      usdcPriceUsd: response.data["usd-coin"].usd,
    };
  } catch (error) {
    console.error("Error fetching CoinGecko prices:", error.message);
    throw new Error("Failed to fetch prices");
  }
}

async function approveTokens(tokenContract, amount) {
  try {
    const allowance = await tokenContract.allowance(
      wallet.address,
      process.env.ORACLE_CONTRACT_ADDRESS
    );
    if (allowance >= amount) {
      console.log("Token already approved");
      return;
    }
    console.log(
      `Approving ${ethers.formatUnits(
        amount,
        tokenContract === wethContract ? 18 : 6
      )} ${
        tokenContract.address === process.env.WETH_ADDRESS ? "WETH" : "USDC"
      }...`
    );
    const tx = await tokenContract.approve(
      process.env.ORACLE_CONTRACT_ADDRESS,
      amount
    );
    console.log("Approval hash:", tx.hash);
    await tx.wait();
    console.log("Approval confirmed");
  } catch (error) {
    console.error("Approval failed:", error.message);
  }
}

async function runDisputeBot() {
  console.log("Starting dispute bot...");
  const minSettlerRewardWei = ethers.parseEther("0.00003"); // ~3 cents at 0.01 gwei

  // Monitor events
  oracleContract.on(
    "InitialReportSubmitted",
    async (
      reportId,
      reporter,
      amount1,
      amount2,
      token1Address,
      token2Address,
      swapFee,
      protocolFee,
      settlementTime,
      disputeDelay,
      escalationHalt,
      timeType,
      callbackContract,
      callbackSelector,
      trackDisputes,
      callbackGasLimit,
      stateHash,
      event
    ) => {
      await processEvent(
        reportId,
        amount1,
        amount2,
        token1Address,
        token2Address,
        swapFee,
        protocolFee,
        settlementTime,
        disputeDelay,
        escalationHalt,
        timeType,
        callbackContract,
        callbackSelector,
        trackDisputes,
        callbackGasLimit,
        stateHash,
        event
      );
    }
  );

  oracleContract.on(
    "ReportDisputed",
    async (
      reportId,
      disputer,
      newAmount1,
      newAmount2,
      token1Address,
      token2Address,
      swapFee,
      protocolFee,
      settlementTime,
      disputeDelay,
      escalationHalt,
      timeType,
      callbackContract,
      callbackSelector,
      trackDisputes,
      callbackGasLimit,
      stateHash,
      event
    ) => {
      await processEvent(
        reportId,
        newAmount1,
        newAmount2,
        token1Address,
        token2Address,
        swapFee,
        protocolFee,
        settlementTime,
        disputeDelay,
        escalationHalt,
        timeType,
        callbackContract,
        callbackSelector,
        trackDisputes,
        callbackGasLimit,
        stateHash,
        event
      );
    }
  );

  async function processEvent(
    reportId,
    amount1,
    amount2,
    token1Address,
    token2Address,
    swapFee,
    protocolFee,
    settlementTime,
    disputeDelay,
    escalationHalt,
    timeType,
    callbackContract,
    callbackSelector,
    trackDisputes,
    callbackGasLimit,
    stateHash,
    event
  ) {
    try {
      console.log(`Processing report ${reportId}...`);

      // Fetch report metadata
      const meta = await oracleContract.reportMeta(reportId);

      // Apply validation filters
      if (
        token1Address !== process.env.WETH_ADDRESS ||
        token2Address !== process.env.USDC_ADDRESS
      ) {
        console.log(`Invalid tokens: ${token1Address}, ${token2Address}`);
        return;
      }
      if (swapFee > 5000) {
        console.log(`Fee too high: ${swapFee} bps`);
        return;
      }
      if (meta.multiplier < 101 || meta.multiplier > 150) {
        console.log(`Invalid multiplier: ${meta.multiplier}`);
        return;
      }
      if (meta.exactToken1Report > ethers.parseEther("0.05")) {
        console.log(
          `ExactToken1Report too high: ${ethers.formatEther(
            meta.exactToken1Report
          )} WETH`
        );
        return;
      }
      if (settlementTime > 30) {
        console.log(`Settlement time too long: ${settlementTime} seconds`);
        return;
      }
      if (protocolFee > 1001) {
        console.log(`Protocol fee too high: ${protocolFee} bps`);
        return;
      }
      if (meta.settlerReward < minSettlerRewardWei) {
        console.log(
          `Settler reward too low: ${ethers.formatEther(
            meta.settlerReward
          )} ETH`
        );
        return;
      }
      if (
        callbackContract !== "0x0000000000000000000000000000000000000000" ||
        callbackSelector !== "0x00000000" ||
        callbackGasLimit !== 0
      ) {
        console.log(
          `Callback not allowed: ${callbackContract}, ${callbackSelector}, ${callbackGasLimit}`
        );
        return;
      }

      // Fetch real-time prices
      const { wethPriceUsd, usdcPriceUsd } = await fetchCryptoPrices();

      // Calculate implied price and fee band
      const amount1Usd = Number(ethers.formatEther(amount1)) * wethPriceUsd;
      const amount2Usd = Number(ethers.formatUnits(amount2, 6)) * usdcPriceUsd;
      const oldPrice = (amount1 * BigInt(1e18)) / amount2; // WETH/USDC price
      const feeBoundary = (oldPrice * BigInt(swapFee)) / BigInt(1e7);
      const lowerBoundary =
        oldPrice > feeBoundary ? oldPrice - feeBoundary : BigInt(0);
      const upperBoundary = oldPrice + feeBoundary;

      // Determine tokenToSwap (lower USD value)
      const tokenToSwap =
        amount1Usd <= amount2Usd
          ? process.env.WETH_ADDRESS
          : process.env.USDC_ADDRESS;

      // Calculate newAmount1
      let newAmount1;
      if (amount1 < meta.escalationHalt) {
        newAmount1 = (amount1 * BigInt(meta.multiplier)) / BigInt(100);
      } else {
        newAmount1 = amount1 + BigInt(1);
      }

      // Calculate newAmount2 (match USD value, outside fee band)
      let newAmount2;
      if (tokenToSwap === process.env.WETH_ADDRESS) {
        const newAmount1Usd =
          Number(ethers.formatEther(newAmount1)) * wethPriceUsd;
        newAmount2 = ethers.parseUnits(
          (newAmount1Usd / usdcPriceUsd).toFixed(6),
          6
        );
        const newPrice = (newAmount1 * BigInt(1e18)) / newAmount2;
        if (newPrice >= lowerBoundary && newPrice <= upperBoundary) {
          newAmount2 = ethers.parseUnits(
            ((newAmount1Usd / usdcPriceUsd) * 0.95).toFixed(6),
            6
          ); // Adjust to exit fee band
        }
      } else {
        const newAmount1Usd =
          Number(ethers.formatEther(newAmount1)) * wethPriceUsd;
        newAmount2 = ethers.parseUnits(
          (newAmount1Usd / usdcPriceUsd).toFixed(6),
          6
        );
        const newPrice = (newAmount1 * BigInt(1e18)) / newAmount2;
        if (newPrice >= lowerBoundary && newPrice <= upperBoundary) {
          newAmount2 = ethers.parseUnits(
            ((newAmount1Usd / usdcPriceUsd) * 1.05).toFixed(6),
            6
          ); // Adjust to exit fee band
        }
      }

      // Calculate approval amounts
      let approvalAmount;
      if (tokenToSwap === process.env.WETH_ADDRESS) {
        const fee = (amount1 * BigInt(swapFee)) / BigInt(1e7);
        const protocolFeeAmount = (amount1 * BigInt(protocolFee)) / BigInt(1e7);
        approvalAmount = amount1 + fee + protocolFeeAmount;
        if (newAmount2 > amount2) {
          approvalAmount += newAmount2 - amount2;
        }
      } else {
        const fee = (amount2 * BigInt(swapFee)) / BigInt(1e7);
        const protocolFeeAmount = (amount2 * BigInt(protocolFee)) / BigInt(1e7);
        approvalAmount = amount2 + fee + protocolFeeAmount + newAmount2;
        if (newAmount1 > amount1) {
          approvalAmount += newAmount1 - amount1;
        }
      }

      // Approve tokens
      await approveTokens(
        tokenToSwap === process.env.WETH_ADDRESS ? wethContract : usdcContract,
        approvalAmount
      );

      // Simulate dispute
      console.log(`Simulating dispute for report ${reportId}...`);
      const tx = await oracleContract.disputeAndSwap.populateTransaction(
        reportId,
        tokenToSwap,
        newAmount1,
        newAmount2,
        amount2,
        stateHash
      );
      console.log("Simulated transaction:", tx);

      // Confirm dispute
      console.log(
        "WARNING: Funds in VPS key are at risk. Confirm dispute details:"
      );
      console.log(
        `Report ID: ${reportId}, Token to Swap: ${tokenToSwap}, New Amount1: ${ethers.formatEther(
          newAmount1
        )}, New Amount2: ${ethers.formatUnits(newAmount2, 6)}`
      );
      console.log('Type "CONFIRM" to proceed:');
      const readline = require("readline").createInterface({
        input: process.stdin,
        output: process.stdout,
      });
      const answer = await new Promise((resolve) => {
        readline.question("", resolve);
      });
      readline.close();
      if (answer !== "CONFIRM") {
        console.log("Dispute aborted");
        return;
      }

      // Execute dispute
      console.log("Executing dispute...");
      const txResponse = await oracleContract.disputeAndSwap(
        reportId,
        tokenToSwap,
        newAmount1,
        newAmount2,
        amount2,
        stateHash
      );
      console.log("Dispute transaction hash:", txResponse.hash);
      await txResponse.wait();
      console.log(
        "Dispute confirmed. Check Arbiscan: https://arbiscan.io/tx/" +
          txResponse.hash
      );
    } catch (error) {
      console.error(`Dispute failed for report ${reportId}:`, error.message);
    }
  }
}

runDisputeBot();
