import { loadFixture } from "@nomicfoundation/hardhat-network-helpers";
import { expect } from "chai";
import { ethers } from "hardhat";
import { boolean } from "hardhat/internal/core/params/argumentTypes";

describe("evm_chess Wager Unit Tests", function () {
  // We define a fixture to reuse the same setup in every test.
  async function deploy() {
    const [deployer, user0, user1] = await ethers.getSigners();

    const ERC20_token = await ethers.getContractFactory("Token");
    const tokenA = await ERC20_token.deploy();
    const tokenB = await ERC20_token.deploy();

    const DIVIDEND_TOKEN = await ethers.getContractFactory("DividendToken");
    const dividendToken = await DIVIDEND_TOKEN.deploy();

    const PAYMENT_SPLITTER = await ethers.getContractFactory("PaymentSplitter");
    const splitter = await PAYMENT_SPLITTER.deploy(await dividendToken.getAddress());

    const protocolFee = ethers.parseEther("0.01");
    const AMM = await ethers.getContractFactory("SberAMM");
    const amm = await AMM.deploy(protocolFee, await splitter.getAddress());

    // send erc20 tokens to user1
    await tokenA.connect(deployer).transfer(user0.address, ethers.parseEther("100000"));
    await tokenB.connect(deployer).transfer(user0.address, ethers.parseEther("100000"));

    await tokenA.connect(deployer).transfer(user1.address, ethers.parseEther("100000"));
    await tokenB.connect(deployer).transfer(user1.address, ethers.parseEther("100000"));

    return {
      deployer,
      user0,
      user1,
      tokenA,
      tokenB,
      amm,
    };
  }

  describe("SberAMM Tests", function () {
    it("Should Deploy", async function () {
      const { deployer, tokenA, tokenB } = await loadFixture(
        deploy
      );

      console.log("Deployer", deployer.address);

      const balanceA = await tokenA.balanceOf(deployer.address);
      console.log(balanceA);

      const balanceB = await tokenB.balanceOf(deployer.address);
      console.log(balanceB);

    });

    it("Should Create Pair", async function () {
      const { deployer, tokenA, tokenB, amm } = await loadFixture(
        deploy
      );

      console.log("Deployer", deployer.address);

      const balanceA = await tokenA.balanceOf(deployer.address);
      console.log(balanceA);

      const balanceB = await tokenB.balanceOf(deployer.address);
      console.log(balanceB);

      const feeRate = ethers.parseEther("0.003");

      await amm.createPair(await tokenA.getAddress(), await tokenB.getAddress(), feeRate, false);
    });

    it("Should Add Liquidity to Pair", async function () {
      const { deployer, tokenA, tokenB, amm } = await loadFixture(
        deploy
      );

      const balanceA = await tokenA.balanceOf(deployer.address);
      const balanceB = await tokenA.balanceOf(deployer.address);

      const tokenA_address = await tokenA.getAddress();
      const tokenB_address = await tokenB.getAddress();
      const feeRate = ethers.parseEther("0.003");


      await amm.createPair(tokenA_address, tokenB_address, feeRate, false);

      let amountA = ethers.parseEther("100.0");
      let amountB = ethers.parseEther("100.0");

      await tokenA.approve(await amm.getAddress(), amountA);
      await tokenB.approve(await amm.getAddress(), amountB);
 
      await amm.deposit(0, amountA, amountB);

    });

    it("Should Execute Swap", async function () {
      const { deployer, tokenA, tokenB, amm } = await loadFixture(
        deploy
      );

      const tokenA_address = await tokenA.getAddress();
      const tokenB_address = await tokenB.getAddress();
      const feeRate = ethers.parseEther("0.003");

      await amm.createPair(tokenA_address, tokenB_address, feeRate, false);

      let amountA = ethers.parseEther("1000.0");
      let amountB = ethers.parseEther("1000.0");

      await tokenA.approve(await amm.getAddress(), amountA);
      await tokenB.approve(await amm.getAddress(), amountB);
 
      await amm.deposit(0, amountA, amountB);

      // Swap
      await tokenA.approve(await amm.getAddress(), amountA);

      await amm.swap(0, await tokenA.getAddress(), ethers.parseEther("5.0"));
    });
    
    it("Should Execute Deposit, Swap, Withdraw", async function () {
      const { deployer, user0, user1, tokenA, tokenB, amm } = await loadFixture(
        deploy
      );

      const tokenA_address = await tokenA.getAddress();
      const tokenB_address = await tokenB.getAddress();
      const feeRate = ethers.parseEther("0.003");

      await amm.createPair(tokenA_address, tokenB_address, feeRate, false);

      let amountA = ethers.parseEther("1000000.0");
      let amountB = ethers.parseEther("1000000.0");

      await tokenA.approve(await amm.getAddress(), amountA);
      await tokenB.approve(await amm.getAddress(), amountB);
 
      await amm.deposit(0, amountA, amountB);

      const rate0 = Number(await amm.exchangeRate(0, await tokenA.getAddress()));
      console.log("exchange rate t0", rate0);

      // Swap
      await tokenA.approve(await amm.getAddress(), amountA);
      await amm.swap(0, await tokenA.getAddress(), ethers.parseEther("10000"));

      const rate1 = Number(await amm.exchangeRate(0, await tokenA.getAddress()));
      console.log("exchange rate t1", rate1);

      console.log("slippage:", (rate1 - rate0) / rate1 * 100, "%");

      // fees accrued
      const feeAccrued = await amm.viewEarnedFees(0, await tokenA.getAddress())

      let balance_t0 = await tokenA.balanceOf(await deployer.getAddress());
      await amm.withdrawFees(0, await tokenA.getAddress());
      let balance_t1 = await tokenA.balanceOf(await deployer.getAddress());

      console.log("fees transfered: ", balance_t1 - balance_t0);

      expect(feeAccrued).to.be.equal(balance_t1 - balance_t0);

      // Deposit User0
      const depositAmountA = ethers.parseEther("1000");
      const depositAmountB = ethers.parseEther("1000");

      await tokenA.connect(user0).approve(await amm.getAddress(), depositAmountA);
      await tokenB.connect(user0).approve(await amm.getAddress(), depositAmountA);

      // const amount = ethers.parseEther("100000");
      await amm.connect(user0).deposit(0, depositAmountA, depositAmountB);

      // console.log("exchange rate t2", await amm.exchangeRate(0, await tokenA.getAddress()));

      const totalLiquidity0 = await amm.Pools(0);
      // console.log("pools: ", totalLiquidity0);

      // withdraw
      await amm.connect(deployer).withdraw(0);

      // const totalLiquidity1 = await amm.Pools(0);
      // console.log("pools: ", totalLiquidity1);

      // const rate = await amm.exchangeRate(0, await tokenA.getAddress());
      // console.log("exchange rate", await amm.exchangeRate(0, await tokenA.getAddress()));
    });
    it("Should Execute Stable Swap", async function () {
      const { deployer, user0, user1, tokenA, tokenB, amm } = await loadFixture(
        deploy
      );

      const tokenA_address = await tokenA.getAddress();
      const tokenB_address = await tokenB.getAddress();
      const feeRate = ethers.parseEther("0.003");

      await amm.createPair(tokenA_address, tokenB_address, feeRate, true);

      let amountA = ethers.parseEther("1000000.0");
      let amountB = ethers.parseEther("1000000.0");

      await tokenA.approve(await amm.getAddress(), amountA);
      await tokenB.approve(await amm.getAddress(), amountB);
 
      await amm.deposit(0, amountA, amountB);

      const feeAccrued0 = await amm.viewEarnedFees(0, await tokenA.getAddress())
      console.log("fee accrued:", feeAccrued0);

      const rate0 = Number(await amm.exchangeRate(0, await tokenA.getAddress()));
      console.log("exchange rate t0", rate0);

      // Swap
      await tokenA.approve(await amm.getAddress(), amountA);
      await amm.swapStable(0, await tokenA.getAddress(), ethers.parseEther("10000"));

      const rate1 = Number(await amm.exchangeRate(0, await tokenA.getAddress()));
      console.log("exchange rate t1", rate1);

      console.log("slippage:", (rate1 - rate0) / rate1 * 100, "%");

      const feeAccrued = await amm.viewEarnedFees(0, await tokenA.getAddress())

      let balance_t0 = await tokenA.balanceOf(await deployer.getAddress());
      await amm.withdrawFees(0, await tokenA.getAddress());
      let balance_t1 = await tokenA.balanceOf(await deployer.getAddress());

      console.log("fees transfered: ", balance_t1 - balance_t0);

      expect(feeAccrued).to.be.equal(balance_t1 - balance_t0);

    });
  });
});
