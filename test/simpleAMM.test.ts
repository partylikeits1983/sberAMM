import { loadFixture } from "@nomicfoundation/hardhat-network-helpers";
import { expect } from "chai";
import { ethers } from "hardhat";

describe("SberAMM Unit Tests", function () {
  async function deploy() {
    const [deployer, user0, user1] = await ethers.getSigners();

    const ERC20_token = await ethers.getContractFactory("Token");
    const tokenA = await ERC20_token.deploy();
    const tokenB = await ERC20_token.deploy();

    const DIVIDEND_TOKEN = await ethers.getContractFactory("DividendToken");
    const dividendToken = await DIVIDEND_TOKEN.deploy();

    const PAYMENT_SPLITTER = await ethers.getContractFactory("PaymentSplitter");
    const splitter = await PAYMENT_SPLITTER.deploy(await dividendToken.address);

    const AMM = await ethers.getContractFactory("SberAMM");
    const amm = await AMM.deploy();

    // send erc20 tokens to user1
    await tokenA.connect(deployer).transfer(user0.address, ethers.utils.parseEther("100000"));
    await tokenB.connect(deployer).transfer(user0.address, ethers.utils.parseEther("100000"));

    await tokenA.connect(deployer).transfer(user1.address, ethers.utils.parseEther("100000"));
    await tokenB.connect(deployer).transfer(user1.address, ethers.utils.parseEther("100000"));

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
    it("Should Create Pair", async function () {
      const { tokenA, tokenB, amm } = await loadFixture(
        deploy
      );

      const feeRate = ethers.utils.parseEther("0.003");

      await amm.createPair(tokenA.address, tokenB.address, feeRate, false);
    });

    it("Should Add Liquidity to Pair", async function () {
      const { deployer, tokenA, tokenB, amm } = await loadFixture(
        deploy
      );

      const tokenA_address = tokenA.address;
      const tokenB_address = tokenB.address;
      const feeRate = ethers.utils.parseEther("0.003");


      await amm.createPair(tokenA_address, tokenB_address, feeRate, false);

      let amountA = ethers.utils.parseEther("100.0");
      let amountB = ethers.utils.parseEther("100.0");

      await tokenA.approve(amm.address, amountA);
      await tokenB.approve(amm.address, amountB);
 
      await amm.deposit(1, amountA, amountB);
    });

    it("Should Execute Non-Stable Swap", async function () {
      const { deployer, user0, tokenA, tokenB, amm } = await loadFixture(
        deploy
      );

      const tokenA_address = tokenA.address;
      const tokenB_address = tokenB.address;
      const feeRate = ethers.utils.parseEther("0.001");

      const isStable = false;
      await amm.connect(deployer).createPair(tokenA_address, tokenB_address, feeRate, isStable);

      let amountA = ethers.utils.parseEther("10000.0");
      let amountB = ethers.utils.parseEther("10000.0");

      await tokenA.connect(deployer).approve(amm.address, amountA);
      await tokenB.connect(deployer).approve(amm.address, amountB);
 
      await amm.connect(deployer).deposit(1, amountA, amountB);

      await tokenA.connect(user0).approve(amm.address, amountA);

      // Swap
      let amountAIn = "5000";
      let balanceB_t0 = await tokenB.balanceOf(user0.address);
      await amm.connect(user0).swap(1, tokenA.address, ethers.utils.parseEther(amountAIn));
      let balanceB_t1 = await tokenB.balanceOf(user0.address);

      let amountBOut = ethers.utils.formatEther(balanceB_t1.sub(balanceB_t0));

      console.log("Amount A in: ", amountAIn);
      console.log("Amount B out: ", Number(amountBOut).toFixed(2));

    });

    it("Should Execute Stable Swap", async function () {
        const { deployer, user0, tokenA, tokenB, amm } = await loadFixture(
          deploy
        );
  
        const tokenA_address = tokenA.address;
        const tokenB_address = tokenB.address;
        const feeRate = ethers.utils.parseEther("0.001");

        const isStable = true;
        await amm.connect(deployer).createPair(tokenA_address, tokenB_address, feeRate, isStable);
  
        let amountA = ethers.utils.parseEther("10000.0");
        let amountB = ethers.utils.parseEther("10000.0");
  
        await tokenA.connect(deployer).approve(amm.address, amountA);
        await tokenB.connect(deployer).approve(amm.address, amountB);
   
        await amm.connect(deployer).deposit(1, amountA, amountB);
  
        await tokenA.connect(user0).approve(amm.address, amountA);
  
        // Swap
        let amountAIn = "5000";
        let balanceB_t0 = await tokenB.balanceOf(user0.address);
        await amm.connect(user0).swap(1, tokenA.address, ethers.utils.parseEther(amountAIn));
        let balanceB_t1 = await tokenB.balanceOf(user0.address);
  
        let amountBOut = ethers.utils.formatEther(balanceB_t1.sub(balanceB_t0));
  
        console.log("Amount A in: ", amountAIn);
        console.log("Amount B out: ", Number(amountBOut).toFixed(2));
  
      });
      
  });
});