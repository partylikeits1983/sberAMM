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
  const tokenB = await ERC20_token.deploy();

  const DIVIDEND_TOKEN = await ethers.getContractFactory("DividendToken");
  const dividendToken = await DIVIDEND_TOKEN.deploy();

  const PAYMENT_SPLITTER = await ethers.getContractFactory("PaymentSplitter");
  const splitter = await PAYMENT_SPLITTER.deploy(await dividendToken.getAddress());

  const protocolFee = ethers.parseEther("0.01");
  const AMM = await ethers.getContractFactory("SberAMM");
  const amm = await AMM.deploy(protocolFee, await splitter.getAddress());

  const chainId = Number(network.chainId);
  const networkName = network.name;
  const contractAddresses: ContractAddresses = {
    network: networkName,
    chainID: chainId,
    owner: owner.address,
    testTokenA: await tokenA.getAddress(),
    testTokenB: await tokenB.getAddress(),
    dividendToken: await dividendToken.getAddress(),
    AMM: await amm.getAddress(),
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
