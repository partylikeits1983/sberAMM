import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { expect } from "chai";
import { ethers } from "hardhat";
import { DividendToken, PaymentSplitter, SberAMM, Token } from "../typechain-types";

describe("SberAMM Unit Tests", () => {
    let signers: SignerWithAddress[];
    let deployer: SignerWithAddress;
    let user0: SignerWithAddress;
    let user1: SignerWithAddress;
    let TokenA: Token;
    let TokenB: Token;
    let TokenC: Token;
    let DividendToken: DividendToken;
    let Splitter: PaymentSplitter;
    let SberAMM: SberAMM;
    const feeRate = ethers.utils.parseEther("0.003");
    const swapAmount = ethers.utils.parseEther("10000");
    let firstPID: any;
    let secondPID: any;
    before(async () => {
        signers = await ethers.getSigners();
        deployer = signers[0];
        user0 = signers[1];
        user1 = signers[2];
    });
    it("Should deploy and send erc20 tokens to users", async () => {
        const protocolFee = ethers.utils.parseEther("0.01");
        const amountTotransfer = ethers.utils.parseEther("100000");

        const ERC20_token = await ethers.getContractFactory("Token");
        const DIVIDEND_TOKEN = await ethers.getContractFactory("DividendToken");
        const PAYMENT_SPLITTER = await ethers.getContractFactory("PaymentSplitter");
        const AMM = await ethers.getContractFactory("SberAMM");

        const tokenA = await ERC20_token.deploy();
        const tokenB = await ERC20_token.deploy();
        const tokenC = await ERC20_token.deploy();
        const dividendToken = await DIVIDEND_TOKEN.deploy();
        const splitter = await PAYMENT_SPLITTER.deploy(dividendToken.address);
        const amm = await AMM.deploy(protocolFee, splitter.address);
        expect(tokenA.address).to.not.eq(ethers.constants.AddressZero);
        expect(tokenB.address).to.not.eq(ethers.constants.AddressZero);
        expect(tokenC.address).to.not.eq(ethers.constants.AddressZero);
        expect(dividendToken.address).to.not.eq(ethers.constants.AddressZero);
        expect(splitter.address).to.not.eq(ethers.constants.AddressZero);
        expect(amm.address).to.not.eq(ethers.constants.AddressZero);

        TokenA = tokenA as Token;
        TokenB = tokenB as Token;
        TokenC = tokenC as Token;
        DividendToken = dividendToken as DividendToken;
        Splitter = splitter as PaymentSplitter;
        SberAMM = amm as SberAMM;

        await TokenA.transfer(user0.address, amountTotransfer);
        await TokenB.transfer(user0.address, amountTotransfer);
        await TokenC.transfer(user0.address, amountTotransfer);
        await TokenA.transfer(user1.address, amountTotransfer);
        await TokenB.transfer(user1.address, amountTotransfer);
        // await TokenC.transfer(user1.address, amountTotransfer);
        expect(await tokenA.balanceOf(user0.address)).to.eq(amountTotransfer);
        expect(await TokenB.balanceOf(user0.address)).to.eq(amountTotransfer);
        expect(await TokenC.balanceOf(user0.address)).to.eq(amountTotransfer);
        expect(await tokenA.balanceOf(user1.address)).to.eq(amountTotransfer);
        expect(await TokenB.balanceOf(user1.address)).to.eq(amountTotransfer);
        // expect(await TokenC.balanceOf(user1.address)).to.eq(amountTotransfer);
    });

    it("Should Create Pair", async () => {
        await SberAMM.createPair(TokenA.address, TokenB.address, feeRate, false);
        firstPID = await SberAMM.numberOfPools();
        expect(firstPID).to.equal(1);

        await SberAMM.createPair(TokenA.address, TokenC.address, feeRate, true);
        secondPID = await SberAMM.numberOfPools();
        expect(secondPID).to.equal(2);
    });

    it("Should Add Liquidity to Pair", async () => {
        let amountA = ethers.utils.parseEther("100");
        let amountB = ethers.utils.parseEther("100");
        let amountAc = ethers.utils.parseEther("100000");
        let amountC = ethers.utils.parseEther("1000000");

        await TokenA.approve(SberAMM.address, ethers.constants.MaxUint256);
        await TokenB.approve(SberAMM.address, ethers.constants.MaxUint256);
        await TokenC.approve(SberAMM.address, ethers.constants.MaxUint256);

        await SberAMM.deposit(firstPID, amountA, amountB);
        await SberAMM.deposit(secondPID, amountAc, amountC);
    });

    it("Should Execute Swap", async () => {
        await SberAMM.swap(firstPID, TokenA.address, ethers.utils.parseEther("5"));
    });

    it("Should Execute Deposit, Swap, Withdraw", async () => {
        const rate0 = Number(await SberAMM.exchangeRate(firstPID, TokenA.address));
        console.log("exchange rate t0", rate0);

        // Swap
        await SberAMM.swap(firstPID, TokenA.address, swapAmount);
        const rate1 = Number(await SberAMM.exchangeRate(firstPID, TokenA.address));
        console.log("exchange rate t1", rate1);
        console.log("slippage:", ((rate1 - rate0) / rate1) * 100, "%");

        // fees accrued
        const feeAccrued = await SberAMM.viewEarnedFees(firstPID, TokenA.address);

        const balance_t0 = await TokenA.balanceOf(deployer.address);
        await SberAMM.withdrawFees(firstPID, TokenA.address);
        const balance_t1 = await TokenA.balanceOf(deployer.address);

        const feesTransfered = balance_t1.sub(balance_t0);
        console.log("fees transfered: %s", feesTransfered);

        expect(feeAccrued).to.be.equal(feesTransfered);

        // Deposit User0
        const depositAmountA = ethers.utils.parseEther("1000");
        const depositAmountB = ethers.utils.parseEther("1000");

        await TokenA.connect(user0).approve(SberAMM.address, depositAmountA);
        await TokenB.connect(user0).approve(SberAMM.address, depositAmountA);

        // const amount = ethers.utils.parseEther("100000");
        await SberAMM.connect(user0).deposit(firstPID, depositAmountA, depositAmountB);

        // console.log("exchange rate t2", await amm.exchangeRate(firstPID, await tokenA.address));

        const totalLiquidity0 = await SberAMM.Pools(firstPID);
        // console.log("pools: ", totalLiquidity0);

        // withdraw
        await SberAMM.connect(deployer).withdraw(firstPID);

        // const totalLiquidity1 = await amm.Pools(0);
        // console.log("pools: ", totalLiquidity1);

        // const rate = await amm.exchangeRate(firstPID, await tokenA.address);
        // console.log("exchange rate", await amm.exchangeRate(firstPID, await tokenA.address));
    });

    it("Should Execute Stable Swap", async () => {
        const feeAccrued0 = await SberAMM.viewEarnedFees(secondPID, TokenA.address);
        console.log("fee accrued: %s", feeAccrued0);

        const rate0 = Number(await SberAMM.exchangeRate(secondPID, TokenA.address));
        console.log("exchange rate t0", rate0);

        // Swap
        await SberAMM.swapStable(secondPID, TokenA.address, swapAmount);

        const rate1 = Number(await SberAMM.exchangeRate(secondPID, TokenA.address));
        console.log("exchange rate t1", rate1);

        console.log("slippage:", ((rate1 - rate0) / rate1) * 100, "%");

        const feeAccrued = await SberAMM.viewEarnedFees(secondPID, TokenA.address);

        let balance_t0 = await TokenA.balanceOf(deployer.address);
        await SberAMM.withdrawFees(secondPID, TokenA.address);
        let balance_t1 = await TokenA.balanceOf(deployer.address);

        const feesTransfered = balance_t1.sub(balance_t0);
        console.log("fees transfered: %s", feesTransfered);

        expect(feeAccrued).to.be.equal(feesTransfered);
    });

    it("Should Check All Possible Reverts", async () => {
        await expect(SberAMM.createPair(TokenA.address, TokenA.address, feeRate, false)).to.be.revertedWith("two identical addresses");
        await expect(SberAMM.createPair(ethers.constants.AddressZero, TokenB.address, feeRate, false)).to.be.revertedWith("Zero Address tokenA");
        await expect(SberAMM.createPair(TokenA.address, ethers.constants.AddressZero, feeRate, false)).to.be.revertedWith("Zero Address tokenB");
        await expect(SberAMM.createPair(TokenA.address, TokenC.address, feeRate, true)).to.be.revertedWith("Pair already exists");

        await expect(SberAMM.deposit(3, swapAmount, swapAmount)).to.be.revertedWith("PID does not exist");

        await expect(SberAMM.withdraw(3)).to.be.revertedWith("PID does not exist");

        await expect(SberAMM.swap(3, TokenA.address, swapAmount)).to.be.revertedWith("PID does not exist");
        await expect(SberAMM.swap(firstPID, TokenC.address, swapAmount)).to.be.revertedWith("Address: call to non-contract");
        await expect(SberAMM.swap(secondPID, TokenC.address, swapAmount)).to.be.revertedWith("not x * y = k");
        await expect(SberAMM.connect(user1).swap(firstPID, TokenB.address, swapAmount)).to.be.revertedWith("ERC20: insufficient allowance");

        await expect(SberAMM.swapStable(3, TokenA.address, swapAmount)).to.be.revertedWith("PID does not exist");
        await expect(SberAMM.swapStable(secondPID, TokenB.address, swapAmount)).to.be.revertedWith("Address: call to non-contract");
        await expect(SberAMM.swapStable(firstPID, TokenC.address, swapAmount)).to.be.revertedWith("not x^2 * y^2 = k^2");
        await expect(SberAMM.connect(user1).swapStable(secondPID, TokenC.address, swapAmount)).to.be.revertedWith("ERC20: insufficient allowance");

        await expect(SberAMM.withdrawFees(3, TokenA.address)).to.be.revertedWith("PID does not exist");

        await expect(SberAMM.viewEarnedFees(3, TokenA.address)).to.be.revertedWith("PID does not exist");

        await expect(SberAMM.exchangeRate(3, TokenA.address)).to.be.revertedWith("PID does not exist");
    });
});
