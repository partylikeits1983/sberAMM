import { loadFixture } from "@nomicfoundation/hardhat-network-helpers";
import { expect } from "chai";
import { ethers } from "hardhat";

describe("evm_chess Wager Unit Tests", function () {
  // We define a fixture to reuse the same setup in every test.
  async function deploy() {
    const [deployer, user0, user1] = await ethers.getSigners();

    const ERC20_token = await ethers.getContractFactory("ERC20");
    const token = await ERC20_token.deploy();

    return {
      deployer,
      user0,
      user1,
      token
    };
  }

  describe("SberAMM Tests", function () {
    it("Should Add Liquidity", async function () {
      const { deployer, token } = await loadFixture(
        deploy
      );

      console.log("Deployer", deployer.address);


      const balance = await token.balanceOf(deployer.address);
      console.log(balance);


    });

  });
});
