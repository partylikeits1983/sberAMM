import { loadFixture } from "@nomicfoundation/hardhat-network-helpers";
import { expect } from "chai";
import { ethers } from "hardhat";

describe("evm_chess Wager Unit Tests", function () {
  // We define a fixture to reuse the same setup in every test.
  async function deploy() {
    const [deployer, user0, user1] = await ethers.getSigners();

    const ERC20_token = await ethers.getContractFactory("Token");
    const tokenA = await ERC20_token.deploy();
    const tokenB = await ERC20_token.deploy();

/*     const MATH = await ethers.getContractFactory("SD");
    const math = await MATH.deploy(); */
    
    const AMM = await ethers.getContractFactory("SberAMM");
    const amm = await AMM.deploy();

    // send erc20 tokens to user1
    await tokenA.connect(deployer).transfer(user0.address, ethers.parseEther("10000"));
    await tokenB.connect(deployer).transfer(user0.address, ethers.parseEther("10000"));

    await tokenA.connect(deployer).transfer(user1.address, ethers.parseEther("10000"));
    await tokenB.connect(deployer).transfer(user1.address, ethers.parseEther("10000"));

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

      await amm.createPair(await tokenA.getAddress(), await tokenB.getAddress());

    });

    it("Should Add Liquidity to Pair", async function () {
      const { deployer, tokenA, tokenB, amm } = await loadFixture(
        deploy
      );

      console.log("Deployer", deployer.address);

      const balanceA = await tokenA.balanceOf(deployer.address);
      console.log(balanceA);

      const balanceB = await tokenA.balanceOf(deployer.address);
      console.log(balanceB);

      const tokenA_address = await tokenA.getAddress();
      const tokenB_address = await tokenB.getAddress();

      await amm.createPair(tokenA_address, tokenB_address);

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

      console.log("Deployer", deployer.address);

      const balanceA = await tokenA.balanceOf(deployer.address);
      console.log(balanceA);

      const balanceB = await tokenA.balanceOf(deployer.address);
      console.log(balanceB);

      const tokenA_address = await tokenA.getAddress();
      const tokenB_address = await tokenB.getAddress();

      await amm.createPair(tokenA_address, tokenB_address);

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

      console.log("Deployer", deployer.address);

      const balanceA = await tokenA.balanceOf(deployer.address);
      console.log(balanceA);

      const balanceB = await tokenA.balanceOf(deployer.address);
      console.log(balanceB);

      const tokenA_address = await tokenA.getAddress();
      const tokenB_address = await tokenB.getAddress();

      await amm.createPair(tokenA_address, tokenB_address);

      let amountA = ethers.parseEther("100000.0");
      let amountB = ethers.parseEther("100000.0");

      await tokenA.approve(await amm.getAddress(), amountA);
      await tokenB.approve(await amm.getAddress(), amountB);
 
      await amm.deposit(0, amountA, amountB);

      // Swap
      await tokenA.approve(await amm.getAddress(), amountA);
      await amm.swap(0, await tokenA.getAddress(), ethers.parseEther("100"));

      // Deposit User0
      await tokenA.connect(user0).approve(await amm.getAddress(), amountA);
      await tokenB.connect(user0).approve(await amm.getAddress(), amountA);

      const amount = ethers.parseEther("100");
      await amm.connect(user0).deposit(0, amount, amount);

      const totalLiquidity0 = await amm.Pools(0);
      console.log("pools: ", totalLiquidity0);

      // withdraw
      await amm.connect(deployer).withdraw(0);

      const totalLiquidity1 = await amm.Pools(0);
      console.log("pools: ", totalLiquidity1);
 
    });

  });
});
