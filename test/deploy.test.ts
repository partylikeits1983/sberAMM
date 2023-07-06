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

    return {
      deployer,
      user0,
      user1,
      tokenA,
      tokenB,
      factory
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



  });
});
