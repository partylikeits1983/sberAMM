import { expect } from "chai";
import { ethers } from "hardhat";
const fs = require("fs");

interface ContractAddresses {
  network: string;
  chainID: number;
  owner: string;
  testTokenA: string;
  testTokenB: string;
  dividendToken: string;
  AMM: string;
}

async function deploy(): Promise<void> {
  const network = await ethers.provider.getNetwork();

  const [owner, otherAccount] = await ethers.getSigners();

  const ERC20_token = await ethers.getContractFactory("Token");
  const tokenA = await ERC20_token.deploy();
  await tokenA.deployed();

  const tokenB = await ERC20_token.deploy();
  await tokenB.deployed();

  const DIVIDEND_TOKEN = await ethers.getContractFactory("DividendToken");
  const dividendToken = await DIVIDEND_TOKEN.deploy();
  await dividendToken.deployed();

  const PAYMENT_SPLITTER = await ethers.getContractFactory("PaymentSplitter");
  const splitter = await PAYMENT_SPLITTER.deploy(dividendToken.address);
  await splitter.deployed();

  const protocolFee = ethers.utils.parseEther("0.01");
  const AMM = await ethers.getContractFactory("SberAMM");
  const amm = await AMM.deploy(protocolFee, splitter.address);
  await amm.deployed();

  const chainId = Number(network.chainId);
  const networkName = network.name;
  const contractAddresses: ContractAddresses = {
    network: networkName,
    chainID: chainId,
    owner: owner.address,
    testTokenA: tokenA.address,
    testTokenB: tokenB.address,
    dividendToken: dividendToken.address,
    AMM: amm.address,
  };

  let existingAddresses: ContractAddresses[] = [];

  try {
    const data = fs.readFileSync("contractAddresses.json", "utf8");
    const parsedData = JSON.parse(data);
    existingAddresses = Array.isArray(parsedData) ? parsedData : [parsedData];
  } catch (err) {
    console.error("Error reading contractAddresses.json file:", err);
  }

  const index = existingAddresses.findIndex(
    (addr) => addr.chainID === contractAddresses.chainID
  );

  if (index !== -1) {
    existingAddresses[index] = contractAddresses; // Update the existing entry
  } else {
    existingAddresses.push(contractAddresses); // Add new entry
  }

  fs.writeFileSync(
    "contractAddresses.json",
    JSON.stringify(existingAddresses, null, 2)
  );

  console.log("Network: ", contractAddresses.network);
  console.log("Deployer: ", contractAddresses.owner);
  console.log("Test tokenA address", contractAddresses.testTokenA);
  console.log("Test tokenB address", contractAddresses.testTokenB);
  console.log("Dividend Token Address ", contractAddresses.dividendToken);
  console.log("AMM contract address", contractAddresses.AMM);

}

async function main(): Promise<void> {
  await deploy();
}

main();
