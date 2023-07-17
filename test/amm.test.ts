import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { expect } from "chai";
import { ethers } from "hardhat";
import { DividendToken, PaymentSplitter, SberAMM, Token } from "../typechain-types";

describe("SberAMM Unit Tests", () => {
    let signers: SignerWithAddress[];
    let admin: SignerWithAddress;
    let user0: SignerWithAddress;
    let user1: SignerWithAddress;
    let TokenA: Token;
    let TokenB: Token;
    let TokenC: Token; // stable
    let DividendToken: DividendToken;
    let Splitter: PaymentSplitter;
    let SberAMM: SberAMM;
    let firstPID: any;
    let secondPID: any;
    const feeRate = ethers.utils.parseEther("0.003");
    const mediumAmount = ethers.utils.parseEther("50000");
    const largeAmount = ethers.utils.parseEther("100000");
    before(async () => {
        signers = await ethers.getSigners();
        admin = signers[0];
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
        const dividendToken = await DIVIDEND_TOKEN.deploy();
        const splitter = await PAYMENT_SPLITTER.deploy(dividendToken.address);
        const amm = await AMM.deploy();

        const amplificationFactor = ethers.utils.parseEther("0.025")
        await amm.modifyAmplificationFactor(amplificationFactor);

        await amm.modifyFeeAmount(protocolFee);
        await amm.modifySplitterAddress(splitter.address);

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

        await TokenA.transfer(user0.address, largeAmount.mul(3));
        await TokenB.transfer(user0.address, largeAmount.mul(3));
        await TokenC.transfer(user0.address, largeAmount.mul(3));
        await TokenA.transfer(user1.address, largeAmount.mul(3));
        await TokenB.transfer(user1.address, largeAmount.mul(3));
        await TokenC.transfer(user1.address, largeAmount.mul(3));

        await TokenA.connect(user0).approve(SberAMM.address, ethers.constants.MaxUint256);
        await TokenB.connect(user0).approve(SberAMM.address, ethers.constants.MaxUint256);
        await TokenC.connect(user0).approve(SberAMM.address, ethers.constants.MaxUint256);
        await TokenA.connect(user1).approve(SberAMM.address, ethers.constants.MaxUint256);
        await TokenB.connect(user1).approve(SberAMM.address, ethers.constants.MaxUint256);
        await TokenC.connect(user1).approve(SberAMM.address, ethers.constants.MaxUint256);

        expect(await tokenA.balanceOf(user0.address)).to.eq(largeAmount.mul(3));
        expect(await TokenB.balanceOf(user0.address)).to.eq(largeAmount.mul(3));
        expect(await TokenC.balanceOf(user0.address)).to.eq(largeAmount.mul(3));
        expect(await tokenA.balanceOf(user1.address)).to.eq(largeAmount.mul(3));
        expect(await TokenB.balanceOf(user1.address)).to.eq(largeAmount.mul(3));
        expect(await TokenC.balanceOf(user1.address)).to.eq(largeAmount.mul(3));
    });

    it("Should Create Pairs", async () => {
        await SberAMM.createPair(TokenA.address, TokenB.address, feeRate, false);
        firstPID = await SberAMM.numberOfPools();
        expect(firstPID).to.equal(1);

        await SberAMM.createPair(TokenA.address, TokenC.address, feeRate, true);
        secondPID = await SberAMM.numberOfPools();
        expect(secondPID).to.equal(2);
    });

    it("Should Add Liquidity to Pairs", async () => {
        await TokenA.approve(SberAMM.address, ethers.constants.MaxUint256);
        await TokenB.approve(SberAMM.address, ethers.constants.MaxUint256);
        await TokenC.approve(SberAMM.address, ethers.constants.MaxUint256);

        await SberAMM.deposit(firstPID, largeAmount, largeAmount);
        await SberAMM.deposit(secondPID, largeAmount, largeAmount);
    });

    it("Should Execute NOT Stable Swap", async () => {
        const rate0 = Number(await SberAMM.exchangeRate(firstPID, TokenA.address));
        const balanceB_t0 = await TokenB.balanceOf(user0.address);
        console.log("Balance B before swap %s", balanceB_t0)

        await SberAMM.connect(user0).swap(firstPID, TokenA.address, mediumAmount);

        const rate1 = Number(await SberAMM.exchangeRate(firstPID, TokenA.address));
        const balanceB_t1 = await TokenB.balanceOf(user0.address);
        console.log("Balance B after swap %s", balanceB_t1)

        let amountBOut = ethers.utils.formatEther(balanceB_t1.sub(balanceB_t0));

        console.log("slippage:", ((Number(balanceB_t1) - Number(balanceB_t0)) / Number(balanceB_t1) * 100).toFixed(3), "%");
        console.log("Amount B out: ", Number(amountBOut).toFixed(2));
    });

    it("Should Execute Stable Swap", async () => {
        const rate0 = Number(await SberAMM.exchangeRate(secondPID, TokenA.address));
        const balanceC_t0 = await TokenC.balanceOf(user0.address);
        console.log("Balance C before swap %s", balanceC_t0)

        await SberAMM.connect(user0).swap(secondPID, TokenA.address, mediumAmount);

        const rate1 = Number(await SberAMM.exchangeRate(secondPID, TokenA.address));
        const balanceC_t1 = await TokenC.balanceOf(user0.address);
        console.log("Balance C after swap %s", balanceC_t1)

        let amountCOut = ethers.utils.formatEther(balanceC_t1.sub(balanceC_t0));

        console.log("slippage:", ((Number(balanceC_t1) - Number(balanceC_t0)) / Number(balanceC_t1) * 100).toFixed(3), "%");
        console.log("Amount C out: ", Number(amountCOut).toFixed(2));
        console.log("Oracle Price change on 2 PID:", (((rate1 - rate0) / rate1) * 100).toFixed(3), "%");
        console.log("ExchangeRate TokenA on 2 PID: %s", ethers.utils.formatUnits(await SberAMM.exchangeRate(secondPID, TokenA.address)));
        console.log("ExchangeRate TokenB on 2 PID: %s", ethers.utils.formatUnits(await SberAMM.exchangeRate(secondPID, TokenB.address)));
        console.log("TVL TokenA on 2 PID: %s", ethers.utils.formatUnits(await SberAMM.totalValueLocked(secondPID, TokenA.address)))
        console.log("TVL TokenB on 2 PID: %s", ethers.utils.formatUnits(await SberAMM.totalValueLocked(secondPID, TokenB.address)))
    });

    it("Withdraw from NOT stable", async () => {
        const previewParams = await SberAMM.withdrawPreview(firstPID)

        const tokenAbefore = ethers.utils.formatUnits(await TokenA.balanceOf(admin.address))
        const tokenBbefore = ethers.utils.formatUnits(await TokenB.balanceOf(admin.address))
        await SberAMM.withdraw(firstPID)
        const tokenAafter = ethers.utils.formatUnits(await TokenA.balanceOf(admin.address))
        const tokenBafter = ethers.utils.formatUnits(await TokenB.balanceOf(admin.address))

        const deltaA = (Number(tokenAafter) - (Number(tokenAbefore))).toFixed(1)
        const deltaB = (Number(tokenBafter) - (Number(tokenBbefore))).toFixed(1)
        expect(deltaA).to.eq(Number(ethers.utils.formatUnits(previewParams[0])).toFixed(1))
        expect(deltaB).to.eq(Number(ethers.utils.formatUnits(previewParams[1])).toFixed(1))

        console.log("Token A delta %s", deltaA)
        console.log("Token B delta %s", deltaB)
    });

    it("WithdrawFees from stable", async () => {
        const previewParamsFeeA = await SberAMM.viewEarnedFees(secondPID, TokenA.address)
        const previewParamsFeeC = await SberAMM.viewEarnedFees(secondPID, TokenC.address)

        const tokenAbeforeFee = ethers.utils.formatUnits(await TokenA.balanceOf(admin.address))
        const tokenCbeforeFee = ethers.utils.formatUnits(await TokenC.balanceOf(admin.address))
        await SberAMM.withdrawFees(secondPID)
        const tokenAafterFee = ethers.utils.formatUnits(await TokenA.balanceOf(admin.address))
        const tokenCafterFee = ethers.utils.formatUnits(await TokenC.balanceOf(admin.address))

        const deltaAFee = (Number(tokenAafterFee) - (Number(tokenAbeforeFee))).toFixed(1)
        const deltaCFee = (Number(tokenCafterFee) - (Number(tokenCbeforeFee))).toFixed(1)
        expect(deltaAFee).to.eq(Number(ethers.utils.formatUnits(previewParamsFeeA)).toFixed(1))
        expect(deltaCFee).to.eq(Number(ethers.utils.formatUnits(previewParamsFeeC)).toFixed(1))

        console.log("Token A Fee delta %s", deltaAFee)
        console.log("Token C Fee delta %s", deltaCFee)
    });

    it("Should Check All Possible Reverts", async () => {
        await expect(SberAMM.createPair(TokenA.address, TokenA.address, feeRate, false)).to.be.revertedWith("two identical addresses");
        await expect(SberAMM.createPair(ethers.constants.AddressZero, TokenB.address, feeRate, false)).to.be.revertedWith("Zero Address tokenA");
        await expect(SberAMM.createPair(TokenA.address, ethers.constants.AddressZero, feeRate, false)).to.be.revertedWith("Zero Address tokenB");
        await expect(SberAMM.createPair(TokenA.address, TokenC.address, feeRate, true)).to.be.revertedWith("Pair already exists");

        await expect(SberAMM.deposit(4, mediumAmount, mediumAmount)).to.be.revertedWith("PID does not exist");

        await expect(SberAMM.swap(4, TokenA.address, mediumAmount)).to.be.revertedWith("PID does not exist");
        await expect(SberAMM.swap(firstPID, TokenC.address, mediumAmount)).to.be.revertedWith("Address: call to non-contract");

        await expect(SberAMM.withdraw(4)).to.be.revertedWith("PID does not exist");
        await expect(SberAMM.withdraw(firstPID)).to.be.revertedWith("No pool shares to withdraw");
        await expect(SberAMM.withdrawPreview(firstPID)).to.be.revertedWith("No pool shares to withdraw");
        await expect(SberAMM.withdrawPreview(4)).to.be.revertedWith("PID does not exist");
        await expect(SberAMM.withdrawFees(4)).to.be.revertedWith("PID does not exist");
        await expect(SberAMM.withdrawFees(secondPID)).to.be.revertedWith("No shares found for the user");
        await expect(SberAMM.viewEarnedFees(secondPID, TokenC.address)).to.be.revertedWith("No shares found for the user");
        await expect(SberAMM.viewEarnedFees(4, TokenA.address)).to.be.revertedWith("PID does not exist");

        await expect(SberAMM.totalValueLocked(4, TokenA.address)).to.be.revertedWith("PID does not exist");
        await expect(SberAMM.exchangeRate(4, TokenA.address)).to.be.revertedWith("PID does not exist");
    });
});
