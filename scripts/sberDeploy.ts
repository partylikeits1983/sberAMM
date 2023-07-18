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
  splitter: string;
  AMM: string;
}

async function deploy(): Promise<void> {
  const network = await ethers.provider.getNetwork();

  const [owner, otherAccount] = await ethers.getSigners();

  const overrides = {
    gasLimit: 15000000
  };
  
  const ERC20_token = await ethers.getContractFactory("Token");
  const tokenA = await ERC20_token.deploy(overrides);
  await tokenA.deployed();
  console.log("tokenA deployed");

  const tokenB = await ERC20_token.deploy(overrides);
  await tokenB.deployed();
  console.log("tokenB deployed");

  const DIVIDEND_TOKEN = await ethers.getContractFactory("DividendToken");
  const dividendToken = await DIVIDEND_TOKEN.deploy(overrides);
  await dividendToken.deployed();
  console.log("dividendToken deployed");

  const PAYMENT_SPLITTER = await ethers.getContractFactory("PaymentSplitter");
  const splitter = await PAYMENT_SPLITTER.deploy(dividendToken.address, overrides);
  await splitter.deployed();
  console.log("splitter deployed");

  const AMM = await ethers.getContractFactory("SberAMM");
  const amm = await AMM.deploy(overrides);
  await amm.deployed();

  console.log("amm deployed");

  const chainId = Number(network.chainId);
  const networkName = network.name;
  const contractAddresses: ContractAddresses = {
    network: networkName,
    chainID: chainId,
    owner: owner.address,
    testTokenA: tokenA.address,
    testTokenB: tokenB.address,
    dividendToken: dividendToken.address,
    splitter: splitter.address,
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
    existingAddresses[index] = contractAddresses;
  } else {
    existingAddresses.push(contractAddresses); 
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
  console.log("Splitter Token Address ", contractAddresses.splitter);
  console.log("AMM contract address", contractAddresses.AMM);

}

async function main(): Promise<void> {
  await deploy();
}

main();
