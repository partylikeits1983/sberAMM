import { loadFixture } from "@nomicfoundation/hardhat-network-helpers";
import { expect } from "chai";
import { ethers } from "hardhat";

describe("evm_chess Wager Unit Tests", function () {
  // We define a fixture to reuse the same setup in every test.
  async function deploy() {
    const [deployer, user0, user1] = await ethers.getSigners();

    const ERC20_token = await ethers.getContractFactory("ERC20");
    const tokenA = await ERC20_token.deploy();
    const tokenB = await ERC20_token.deploy();

    const FACTORY = await ethers.getContractFactory("UniswapV2Factory");
    const factory = await FACTORY.deploy(deployer.address);

    // const ROUTER = await ethers.getContractFactory("UniswapV2Router");
    // const router = await ROUTER.deploy(await factory.getAddress(), "0x0000000000000000000000000000000000000000");

    return {
      deployer,
      user0,
      user1,
      tokenA,
      tokenB,
      factory,
      // router
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
      const { deployer, tokenA, tokenB, factory } = await loadFixture(
        deploy
      );

      console.log("Deployer", deployer.address);

      const balanceA = await tokenA.balanceOf(deployer.address);
      console.log(balanceA);

      const balanceB = await tokenA.balanceOf(deployer.address);
      console.log(balanceB);

      await factory.createPair(await tokenA.getAddress(), await tokenB.getAddress());

    });

    it("Should Add Liquidity to Pair", async function () {
      const { deployer, tokenA, tokenB, factory, router } = await loadFixture(
        deploy
      );

      console.log("Deployer", deployer.address);

      const balanceA = await tokenA.balanceOf(deployer.address);
      console.log(balanceA);

      const balanceB = await tokenA.balanceOf(deployer.address);
      console.log(balanceB);

      const tokenA_address = await tokenA.getAddress();
      const tokenB_address = await tokenB.getAddress();

      await factory.createPair(tokenA_address, tokenB_address);

      /*
        address tokenA,
        address tokenB,
        uint256 amountADesired,
        uint256 amountBDesired,
        uint256 amountAMin,
        uint256 amountBMin
        */


        const amountA = ethers.parseEther("100.0");
        const amountB = ethers.parseEther("100.0");

      // await router.addLiquidity(tokenA_address, tokenB_address, amountA, amountB, 0, 0);

    });
  });
});
