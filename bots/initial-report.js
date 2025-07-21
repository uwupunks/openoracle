require("dotenv").config();
const { ethers } = require("ethers");
const axios = require("axios");
const { oracleAbi, erc20Abi } = require("../abi/abis");
// Providers
const queryProvider = new ethers.JsonRpcProvider(process.env.QUERY_RPC_URL);

// Wallet
const privateKey = process.env.VPS_PRIVATE_KEY;
if (!privateKey) {
  throw new Error("VPS_PRIVATE_KEY not set in .env");
}
const wallet = new ethers.Wallet(privateKey, queryProvider);

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

async function approveTokens(tokenContract, amount, tokenName) {
  try {
    const allowance = await tokenContract.allowance(
      wallet.address,
      process.env.ORACLE_CONTRACT_ADDRESS
    );
    if (allowance >= amount) {
      console.log(`${tokenName} already approved`);
      return;
    }
    console.log(
      `Approving ${ethers.formatUnits(
        amount,
        tokenContract === wethContract ? 18 : 6
      )} ${tokenName}...`
    );
    const tx = await tokenContract.approve(
      process.env.ORACLE_CONTRACT_ADDRESS,
      amount
    );
    console.log("Approval hash:", tx.hash);
    await tx.wait();
    console.log("Approval confirmed");
  } catch (error) {
    console.error(`Approval failed for ${tokenName}:`, error.message);
  }
}

async function runInitialReportBot() {
  console.log("Starting initial report bot...");
  const minSettlerRewardWei = ethers.parseEther("0.00003"); // ~3 cents at 0.01 gwei

  // Monitor ReportInstanceCreated events
  oracleContract.on(
    "ReportInstanceCreated",
    async (
      reportId,
      token1Address,
      token2Address,
      feePercentage,
      multiplier,
      exactToken1Report,
      ethFee,
      creator,
      settlementTime,
      escalationHalt,
      disputeDelay,
      protocolFee,
      settlerReward,
      timeType,
      callbackContract,
      callbackSelector,
      trackDisputes,
      callbackGasLimit,
      keepFee,
      stateHash
    ) => {
      try {
        console.log(`Processing report ${reportId}...`);

        // Apply validation filters
        if (
          token1Address !== process.env.WETH_ADDRESS ||
          token2Address !== process.env.USDC_ADDRESS
        ) {
          console.log(`Invalid tokens: ${token1Address}, ${token2Address}`);
          return;
        }
        if (feePercentage > 5000) {
          console.log(`Fee too high: ${feePercentage} bps`);
          return;
        }
        if (multiplier < 109 || multiplier > 150) {
          console.log(`Invalid multiplier: ${multiplier}`);
          return;
        }
        if (exactToken1Report > ethers.parseEther("0.05")) {
          console.log(
            `ExactToken1Report too high: ${ethers.formatEther(
              exactToken1Report
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
        if (settlerReward < minSettlerRewardWei) {
          console.log(
            `Settler reward too low: ${ethers.formatEther(settlerReward)} ETH`
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
        if (!keepFee) {
          console.log(`keepFee must be true`);
          return;
        }

        // Estimate gas costs
        const gasPrice = (await txProvider.getFeeData()).gasPrice;
        const gasEstimate =
          await oracleContract.submitInitialReport.estimateGas(
            reportId,
            exactToken1Report,
            exactToken1Report,
            stateHash
          );
        const gasCostWei = (gasPrice * gasEstimate * BigInt(150)) / BigInt(100); // 1.5x gas cost
        const minEthFee = BigInt(
          Math.max(Number(exactToken1Report) * 0.0001, Number(gasCostWei))
        ); // max(0.01% of report, 1.5x gas)

        if (ethFee < minEthFee) {
          console.log(
            `ethFee too low: ${ethers.formatEther(
              ethFee
            )} ETH, required: ${ethers.formatEther(minEthFee)} ETH`
          );
          return;
        }

        // Fetch real-time prices
        const { wethPriceUsd, usdcPriceUsd } = await fetchCryptoPrices();
        console.log(
          `WETH Price: $${wethPriceUsd}, USDC Price: $${usdcPriceUsd}`
        );

        // Calculate amount2 (USDC equivalent of exactToken1Report)
        const amount1Usd =
          Number(ethers.formatEther(exactToken1Report)) * wethPriceUsd;
        const amount2 = ethers.parseUnits(
          (amount1Usd / usdcPriceUsd).toFixed(6),
          6
        ); // USDC: 6 decimals

        // Approve tokens
        await approveTokens(wethContract, exactToken1Report, "WETH");
        await approveTokens(usdcContract, amount2, "USDC");

        // Simulate transaction
        console.log(`Simulating initial report for report ${reportId}...`);
        const tx = await oracleContract.submitInitialReport.populateTransaction(
          reportId,
          exactToken1Report,
          amount2,
          stateHash,
          { value: ethFee }
        );
        console.log("Simulated transaction:", tx);

        // Confirm report
        console.log(
          "WARNING: Funds in VPS key are at risk. Confirm report details:"
        );
        console.log(
          `Report ID: ${reportId}, Amount1: ${ethers.formatEther(
            exactToken1Report
          )} WETH, Amount2: ${ethers.formatUnits(
            amount2,
            6
          )} USDC, ethFee: ${ethers.formatEther(ethFee)} ETH`
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
          console.log("Report aborted");
          return;
        }

        // Execute report
        console.log("Executing initial report...");
        const txResponse = await oracleContract.submitInitialReport(
          reportId,
          exactToken1Report,
          amount2,
          stateHash,
          { value: ethFee }
        );
        console.log("Report transaction hash:", txResponse.hash);
        await txResponse.wait();
        console.log(
          "Report confirmed. Check Arbiscan: https://arbiscan.io/tx/" +
            txResponse.hash
        );
      } catch (error) {
        console.error(`Report failed for report ${reportId}:`, error.message);
      }
    }
  );
}

runInitialReportBot();
