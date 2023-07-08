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
    let TokenC: Token; // stable
    let TokenD: Token;
    let DividendToken: DividendToken;
    let Splitter: PaymentSplitter;
    let SberAMM: SberAMM;
    let firstPID: any;
    let secondPID: any;
    let thirdPID: any;
    const feeRate = ethers.utils.parseEther("0.003");
    const swapAmount = ethers.utils.parseEther("100");
    const smallAmount = ethers.utils.parseEther("1000");
    const mediumAmount = ethers.utils.parseEther("10000");
    const bigAmount = ethers.utils.parseEther("100000");
    before(async () => {
        signers = await ethers.getSigners();
        deployer = signers[0];
        user0 = signers[1];
        user1 = signers[2];
    });
    it("Should deploy and send erc20 tokens to users", async () => {
        const protocolFee = ethers.utils.parseEther("0.01");

        const ERC20_token = await ethers.getContractFactory("Token");
        const DIVIDEND_TOKEN = await ethers.getContractFactory("DividendToken");
        const PAYMENT_SPLITTER = await ethers.getContractFactory("PaymentSplitter");
        const AMM = await ethers.getContractFactory("SberAMM");

        const tokenA = await ERC20_token.deploy();
        const tokenB = await ERC20_token.deploy();
        const tokenC = await ERC20_token.deploy();
        const tokenD = await ERC20_token.deploy();
        const dividendToken = await DIVIDEND_TOKEN.deploy();
        const splitter = await PAYMENT_SPLITTER.deploy(dividendToken.address);
        const amm = await AMM.deploy();

        await amm.modifyFeeAmount(protocolFee);
        await amm.modifySplitterAddress(splitter.address);

        expect(tokenA.address).to.not.eq(ethers.constants.AddressZero);
        expect(tokenB.address).to.not.eq(ethers.constants.AddressZero);
        expect(tokenC.address).to.not.eq(ethers.constants.AddressZero);
        expect(tokenD.address).to.not.eq(ethers.constants.AddressZero);
        expect(dividendToken.address).to.not.eq(ethers.constants.AddressZero);
        expect(splitter.address).to.not.eq(ethers.constants.AddressZero);
        expect(amm.address).to.not.eq(ethers.constants.AddressZero);

        TokenA = tokenA as Token;
        TokenB = tokenB as Token;
        TokenC = tokenC as Token;
        TokenD = tokenD as Token;
        DividendToken = dividendToken as DividendToken;
        Splitter = splitter as PaymentSplitter;
        SberAMM = amm as SberAMM;

        await TokenA.transfer(user0.address, mediumAmount);
        await TokenB.transfer(user0.address, mediumAmount);
        await TokenC.transfer(user0.address, mediumAmount);
        await TokenD.transfer(user0.address, mediumAmount);
        await TokenA.transfer(user1.address, mediumAmount);
        await TokenB.transfer(user1.address, mediumAmount);
        // await TokenC.transfer(user1.address, mediumAmount);
        await TokenD.transfer(user1.address, mediumAmount);
        expect(await tokenA.balanceOf(user0.address)).to.eq(mediumAmount);
        expect(await TokenB.balanceOf(user0.address)).to.eq(mediumAmount);
        expect(await TokenC.balanceOf(user0.address)).to.eq(mediumAmount);
        expect(await TokenD.balanceOf(user0.address)).to.eq(mediumAmount);
        expect(await tokenA.balanceOf(user1.address)).to.eq(mediumAmount);
        expect(await TokenB.balanceOf(user1.address)).to.eq(mediumAmount);
        // expect(await TokenC.balanceOf(user1.address)).to.eq(mediumAmount);
        expect(await TokenD.balanceOf(user1.address)).to.eq(mediumAmount);
    });

    it("Should Create Pairs", async () => {
        await SberAMM.createPair(TokenA.address, TokenB.address, feeRate, false);
        firstPID = await SberAMM.numberOfPools();
        expect(firstPID).to.equal(1);

        await SberAMM.createPair(TokenA.address, TokenC.address, feeRate, true);
        secondPID = await SberAMM.numberOfPools();
        expect(secondPID).to.equal(2);

        await SberAMM.createPair(TokenB.address, TokenD.address, feeRate, false);
        thirdPID = await SberAMM.numberOfPools();
        expect(thirdPID).to.equal(3);
    });

    it("Should Add Liquidity to Pairs", async () => {
        await TokenA.approve(SberAMM.address, ethers.constants.MaxUint256);
        await TokenB.approve(SberAMM.address, ethers.constants.MaxUint256);
        await TokenC.approve(SberAMM.address, ethers.constants.MaxUint256);
        await TokenD.approve(SberAMM.address, ethers.constants.MaxUint256);

        await SberAMM.deposit(firstPID, smallAmount, smallAmount);
        await SberAMM.deposit(secondPID, mediumAmount, bigAmount);
        await SberAMM.deposit(thirdPID, bigAmount, smallAmount);

        console.log("TVL TokenA on 1 PID: %s", ethers.utils.formatUnits(await SberAMM.totalValueLocked(firstPID, TokenA.address)))
        console.log("TVL TokenB on 1 PID: %s", ethers.utils.formatUnits(await SberAMM.totalValueLocked(firstPID, TokenB.address)))
        console.log("TVL TokenA on 2 PID: %s", ethers.utils.formatUnits(await SberAMM.totalValueLocked(secondPID, TokenA.address)))
        console.log("TVL TokenC on 2 PID: %s", ethers.utils.formatUnits(await SberAMM.totalValueLocked(secondPID, TokenC.address)))
        console.log("TVL TokenB on 3 PID: %s", ethers.utils.formatUnits(await SberAMM.totalValueLocked(thirdPID, TokenB.address)))
        console.log("TVL TokenD on 3 PID: %s", ethers.utils.formatUnits(await SberAMM.totalValueLocked(thirdPID, TokenD.address)))

        console.log("ExchangeRate TokenA on 1 PID: %s", ethers.utils.formatUnits(await SberAMM.exchangeRate(firstPID, TokenA.address)));
        console.log("ExchangeRate TokenB on 1 PID: %s", ethers.utils.formatUnits(await SberAMM.exchangeRate(firstPID, TokenB.address)));
        console.log("ExchangeRate TokenA on 2 PID: %s", ethers.utils.formatUnits(await SberAMM.exchangeRate(secondPID, TokenA.address)));
        console.log("ExchangeRate TokenC on 2 PID: %s", ethers.utils.formatUnits(await SberAMM.exchangeRate(secondPID, TokenC.address)));
        console.log("ExchangeRate TokenB on 3 PID: %s", ethers.utils.formatUnits(await SberAMM.exchangeRate(thirdPID, TokenB.address)));
        console.log("ExchangeRate TokenD on 3 PID: %s", ethers.utils.formatUnits(await SberAMM.exchangeRate(thirdPID, TokenD.address)));
    });

    it("Should Execute Swap", async () => {
        const rate0 = Number(await SberAMM.exchangeRate(firstPID, TokenA.address));
        await SberAMM.swap(firstPID, TokenA.address, ethers.utils.parseEther("5"));

        const rate1 = Number(await SberAMM.exchangeRate(firstPID, TokenA.address));

        console.log("Slippage on 1 PID:", (((rate1 - rate0) / rate1) * 100).toFixed(5), "%");
        console.log("ExchangeRate TokenA on 1 PID: %s", ethers.utils.formatUnits(await SberAMM.exchangeRate(firstPID, TokenA.address)));
        console.log("ExchangeRate TokenB on 1 PID: %s", ethers.utils.formatUnits(await SberAMM.exchangeRate(firstPID, TokenB.address)));
        console.log("TVL TokenA on 1 PID: %s", ethers.utils.formatUnits(await SberAMM.totalValueLocked(firstPID, TokenA.address)))
        console.log("TVL TokenB on 1 PID: %s", ethers.utils.formatUnits(await SberAMM.totalValueLocked(firstPID, TokenB.address)))
    });

    it("Should Execute Deposit, Swap, Withdraw", async () => {
        const rate0 = Number(await SberAMM.exchangeRate(firstPID, TokenA.address));

        // Swap
        await SberAMM.swap(firstPID, TokenA.address, swapAmount);
        const rate1 = Number(await SberAMM.exchangeRate(firstPID, TokenA.address));
        console.log("exchange rate t1", rate1);
        console.log("slippage:", (((rate1 - rate0) / rate1) * 100).toFixed(5), "%");

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
        await SberAMM.swap(secondPID, TokenA.address, swapAmount);

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

        await expect(SberAMM.deposit(4, swapAmount, swapAmount)).to.be.revertedWith("PID does not exist");

        await expect(SberAMM.withdraw(4)).to.be.revertedWith("PID does not exist");
        await expect(SberAMM.connect(deployer).withdraw(firstPID)).to.be.revertedWith("No pool shares to withdraw");

        await expect(SberAMM.swap(4, TokenA.address, swapAmount)).to.be.revertedWith("PID does not exist");
        await expect(SberAMM.swap(firstPID, TokenC.address, swapAmount)).to.be.revertedWith("Address: call to non-contract");
        // await expect(SberAMM.swap(secondPID, TokenC.address, swapAmount)).to.be.revertedWith("not x * y = k");
        await expect(SberAMM.connect(user1).swap(firstPID, TokenB.address, swapAmount)).to.be.revertedWith("ERC20: insufficient allowance");

        await expect(SberAMM.swap(4, TokenA.address, swapAmount)).to.be.revertedWith("PID does not exist");
        await expect(SberAMM.swap(secondPID, TokenB.address, swapAmount)).to.be.revertedWith("Address: call to non-contract");
        // await expect(SberAMM.swap(firstPID, TokenC.address, swapAmount)).to.be.revertedWith("not x^2 * y^2 = k^2");
        await expect(SberAMM.connect(user1).swap(secondPID, TokenC.address, swapAmount)).to.be.revertedWith("ERC20: insufficient allowance");

        await expect(SberAMM.withdrawFees(4, TokenA.address)).to.be.revertedWith("PID does not exist");
        // await expect(SberAMM.withdrawFees(secondPID, TokenA.address)).to.be.revertedWith("No shares found for the user");

        await expect(SberAMM.totalValueLocked(4, TokenA.address)).to.be.revertedWith("PID does not exist");
        await expect(SberAMM.viewEarnedFees(4, TokenA.address)).to.be.revertedWith("PID does not exist");

        await expect(SberAMM.exchangeRate(4, TokenA.address)).to.be.revertedWith("PID does not exist");
    });
});
