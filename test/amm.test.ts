import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { expect } from "chai";
import { ethers } from "hardhat";
import { DividendToken, PaymentSplitter, SberAMM, Token } from "../typechain-types";

describe("SberAMM Unit Tests", () => {
    let signers: SignerWithAddress[];
    let admin: SignerWithAddress;
    let user0: SignerWithAddress;
    let user1: SignerWithAddress;
    let user2: SignerWithAddress;
    let USDT: Token;
    let USDC: Token;
    let DAI: Token;
    let WETH: Token;
    let DividendToken: DividendToken;
    let Splitter: PaymentSplitter;
    let SberAMM: SberAMM;
    let firstPID: any;
    let secondPID: any;
    let thirdPID: any;
    const protocolFee = ethers.utils.parseEther("0.01"); // 1%
    const pairFee = ethers.utils.parseEther("0.003"); // 0.3%
    const smallAmount = ethers.utils.parseEther("10000");
    const mediumAmount = ethers.utils.parseEther("50000");
    const largeAmount = ethers.utils.parseEther("100000");

    // second PID
    const firstSwapAmountDAI = ethers.utils.parseEther("25000");
    const secondSwapAmountDAI = ethers.utils.parseEther("30000");
    const swapAmountUSDT = ethers.utils.parseEther("55000");

    // third PID
    const wethAmount = ethers.utils.parseEther("50");
    before(async () => {
        signers = await ethers.getSigners();
        admin = signers[0];
        user0 = signers[1];
        user1 = signers[2];
        user2 = signers[3];
    });
    it("Should deploy and send erc20 tokens to users", async () => {
        const ERC20_token = await ethers.getContractFactory("Token");
        const DIVIDEND_TOKEN = await ethers.getContractFactory("DividendToken");
        const PAYMENT_SPLITTER = await ethers.getContractFactory("PaymentSplitter");
        const AMM = await ethers.getContractFactory("SberAMM");

        const usdt = await ERC20_token.deploy();
        const usdc = await ERC20_token.deploy();
        const dai = await ERC20_token.deploy();
        const weth = await ERC20_token.deploy();
        const dividendToken = await DIVIDEND_TOKEN.deploy();
        const splitter = await PAYMENT_SPLITTER.deploy(dividendToken.address);
        const amm = await AMM.deploy();

        const amplificationFactor = ethers.utils.parseEther("0.025");
        await amm.modifyAmplificationFactor(amplificationFactor);

        await amm.modifyFeeAmount(protocolFee);
        await amm.modifySplitterAddress(splitter.address);

        expect(usdt.address).to.not.eq(ethers.constants.AddressZero);
        expect(usdc.address).to.not.eq(ethers.constants.AddressZero);
        expect(dai.address).to.not.eq(ethers.constants.AddressZero);
        expect(weth.address).to.not.eq(ethers.constants.AddressZero);
        expect(dividendToken.address).to.not.eq(ethers.constants.AddressZero);
        expect(splitter.address).to.not.eq(ethers.constants.AddressZero);
        expect(amm.address).to.not.eq(ethers.constants.AddressZero);

        USDT = usdt as Token;
        USDC = usdc as Token;
        DAI = dai as Token;
        WETH = weth as Token;
        DividendToken = dividendToken as DividendToken;
        Splitter = splitter as PaymentSplitter;
        SberAMM = amm as SberAMM;

        await USDT.transfer(user0.address, largeAmount.mul(3));
        await USDC.transfer(user0.address, largeAmount.mul(3));
        await DAI.transfer(user0.address, largeAmount.mul(3));
        await WETH.transfer(user0.address, largeAmount.mul(3));
        await USDT.transfer(user1.address, largeAmount.mul(3));
        await USDC.transfer(user1.address, largeAmount.mul(3));
        await DAI.transfer(user1.address, largeAmount.mul(3));
        await WETH.transfer(user1.address, largeAmount.mul(3));
        await DAI.transfer(user2.address, largeAmount.mul(3));
        await WETH.transfer(user2.address, smallAmount.mul(3));

        await USDT.connect(user0).approve(SberAMM.address, ethers.constants.MaxUint256);
        await USDC.connect(user0).approve(SberAMM.address, ethers.constants.MaxUint256);
        await DAI.connect(user0).approve(SberAMM.address, ethers.constants.MaxUint256);
        await WETH.connect(user0).approve(SberAMM.address, ethers.constants.MaxUint256);
        await USDT.connect(user1).approve(SberAMM.address, ethers.constants.MaxUint256);
        await USDC.connect(user1).approve(SberAMM.address, ethers.constants.MaxUint256);
        await DAI.connect(user1).approve(SberAMM.address, ethers.constants.MaxUint256);
        await WETH.connect(user1).approve(SberAMM.address, ethers.constants.MaxUint256);
        await DAI.connect(user2).approve(SberAMM.address, ethers.constants.MaxUint256);
        await WETH.connect(user2).approve(SberAMM.address, ethers.constants.MaxUint256);

        expect(await USDT.balanceOf(user0.address)).to.eq(largeAmount.mul(3));
        expect(await USDC.balanceOf(user0.address)).to.eq(largeAmount.mul(3));
        expect(await DAI.balanceOf(user0.address)).to.eq(largeAmount.mul(3));
        expect(await WETH.balanceOf(user0.address)).to.eq(largeAmount.mul(3));
        expect(await USDT.balanceOf(user1.address)).to.eq(largeAmount.mul(3));
        expect(await USDC.balanceOf(user1.address)).to.eq(largeAmount.mul(3));
        expect(await DAI.balanceOf(user1.address)).to.eq(largeAmount.mul(3));
        expect(await WETH.balanceOf(user1.address)).to.eq(largeAmount.mul(3));
        expect(await DAI.balanceOf(user2.address)).to.eq(largeAmount.mul(3));
        expect(await WETH.balanceOf(user2.address)).to.eq(smallAmount.mul(3));
    });

    it("Should Create Pairs", async () => {
        // USDT-USDC
        await SberAMM.createPair(USDT.address, USDC.address, pairFee, true);
        firstPID = await SberAMM.numberOfPools();
        expect(firstPID).to.equal(1);

        // DAI-USDT
        await SberAMM.createPair(DAI.address, USDT.address, pairFee, true);
        secondPID = await SberAMM.numberOfPools();
        expect(secondPID).to.equal(2);

        // DAI-WETH
        await SberAMM.createPair(DAI.address, WETH.address, pairFee, false);
        thirdPID = await SberAMM.numberOfPools();
        expect(thirdPID).to.equal(3);

        await expect(SberAMM.createPair(USDT.address, USDT.address, pairFee, false)).to.be.revertedWith("two identical addresses");
        await expect(SberAMM.createPair(ethers.constants.AddressZero, USDC.address, pairFee, false)).to.be.revertedWith("Zero Address tokenA");
        await expect(SberAMM.createPair(USDT.address, ethers.constants.AddressZero, pairFee, false)).to.be.revertedWith("Zero Address tokenB");
        await expect(SberAMM.createPair(USDC.address, USDT.address, pairFee, true)).to.be.revertedWith("Pair already exists");
    });

    it("Should Add Liquidity to Pairs", async () => {
        await USDT.approve(SberAMM.address, ethers.constants.MaxUint256);
        await USDC.approve(SberAMM.address, ethers.constants.MaxUint256);
        await DAI.approve(SberAMM.address, ethers.constants.MaxUint256);
        await WETH.approve(SberAMM.address, ethers.constants.MaxUint256);

        await SberAMM.deposit(firstPID, largeAmount, largeAmount);
        await SberAMM.deposit(secondPID, mediumAmount, mediumAmount);

        await expect(SberAMM.deposit(4, mediumAmount, mediumAmount)).to.be.revertedWith("PID does not exist");
    });

    it("First PID: Stable Swap and Withdraw", async () => {
        console.log("Swap 50,000 USDT to USDC in liquidity pool with 100,000 USDT and 100,000 USDC");

        expect(await USDT.balanceOf(user0.address)).to.eq(largeAmount.mul(3));
        expect(await USDC.balanceOf(user0.address)).to.eq(largeAmount.mul(3));
        expect(await USDT.balanceOf(SberAMM.address)).to.eq(largeAmount.add(mediumAmount));
        expect(await USDC.balanceOf(SberAMM.address)).to.eq(largeAmount);
        const balanceUSDC_t0 = await USDC.balanceOf(user0.address);
        await SberAMM.connect(user0).swap(firstPID, USDT.address, mediumAmount);
        const balanceUSDC_t1 = await USDC.balanceOf(user0.address);
        expect(await USDT.balanceOf(user0.address)).to.eq(largeAmount.mul(3).sub(mediumAmount));
        expect(await USDT.balanceOf(SberAMM.address)).to.eq(largeAmount.add(mediumAmount).add(mediumAmount));

        let amountUSDC_out = ethers.utils.formatEther(balanceUSDC_t1.sub(balanceUSDC_t0));
        let amountUSDC_outParseEther = ethers.utils.parseEther(amountUSDC_out);
        expect(await USDC.balanceOf(user0.address)).to.eq(largeAmount.mul(3).add(amountUSDC_outParseEther));
        expect(await USDC.balanceOf(SberAMM.address)).to.eq(largeAmount.sub(amountUSDC_outParseEther));

        console.log(`Was swap 50,000 USDT to ${amountUSDC_out.substring(0, 7)} USDC`);

        let slippage = (((Number(mediumAmount) - Number(amountUSDC_outParseEther)) / Number(mediumAmount)) * 100).toFixed(2);
        console.log("slippage:", slippage, "%");

        expect(await SberAMM.viewEarnedFees(firstPID, USDT.address)).to.be.eq(mediumAmount.mul(3).div(1000)); // .mul(3).div(1000) == 0.003
        expect(await SberAMM.viewEarnedFees(firstPID, USDC.address)).to.be.eq(0);
        await SberAMM.withdrawFees(firstPID);
        expect(await SberAMM.viewEarnedFees(firstPID, USDT.address)).to.be.eq(0);
        expect(await SberAMM.viewEarnedFees(firstPID, USDC.address)).to.be.eq(0);
        await SberAMM.withdrawFees(firstPID);

        const tokensToWithdraw = await SberAMM.withdrawPreview(firstPID);
        let USDTuserShareAfterSwap = largeAmount.add(mediumAmount); // 150,000 USDT
        let USDTpairFee = mediumAmount.mul(3).div(1000); // 0.3% from swap amount
        let USDTprotocolFee = USDTuserShareAfterSwap.sub(USDTpairFee).div(100); // -1% from withdraw amount
        expect(tokensToWithdraw[0]).to.be.eq(USDTuserShareAfterSwap.sub(USDTpairFee).sub(USDTprotocolFee));
        let DAIuserShareAfterSwap = largeAmount.sub(amountUSDC_outParseEther); // 100,000 - 48,342 USDT
        let DAIprotocolFee = DAIuserShareAfterSwap.div(100); // -1% from withdraw amount
        expect(tokensToWithdraw[1]).to.be.eq(DAIuserShareAfterSwap.sub(DAIprotocolFee));
        await SberAMM.withdraw(firstPID);
        await expect(SberAMM.withdraw(firstPID)).to.be.revertedWith("No pool shares to withdraw");
        await expect(SberAMM.withdrawPreview(firstPID)).to.be.revertedWith("No pool shares to withdraw");
        await expect(SberAMM.withdraw(4)).to.be.revertedWith("PID does not exist");
        await expect(SberAMM.withdrawPreview(4)).to.be.revertedWith("PID does not exist");

        await expect(SberAMM.viewEarnedFees(firstPID, USDC.address)).to.be.revertedWith("No pool shares to withdraw fees",);
        await expect(SberAMM.withdrawFees(firstPID)).to.be.revertedWith("No pool shares to withdraw fees");
        await expect(SberAMM.withdrawFees(4)).to.be.revertedWith("PID does not exist");
        await expect(SberAMM.viewEarnedFees(4, USDT.address)).to.be.revertedWith("PID does not exist");

        await expect(SberAMM.swap(4, USDT.address, mediumAmount)).to.be.revertedWith("PID does not exist");
        await expect(SberAMM.swap(firstPID, DAI.address, mediumAmount)).to.be.revertedWith("Wrong token address");
    });

    it("Second PID: Stable Swap", async () => {
        console.log("Swap 25,000 DAI to USDT in liquidity pool with 50,000 DAI and 50,000 USDT");

        expect(await DAI.balanceOf(user1.address)).to.eq(largeAmount.mul(3));
        expect(await DAI.balanceOf(SberAMM.address)).to.eq(mediumAmount);
        const balanceUSDT_t0 = await USDT.balanceOf(user1.address);

        await SberAMM.connect(user1).swap(secondPID, DAI.address, firstSwapAmountDAI);
        const balanceUSDT_t1 = await USDT.balanceOf(user1.address);
        expect(await DAI.balanceOf(user1.address)).to.eq(largeAmount.mul(3).sub(firstSwapAmountDAI));
        expect(await DAI.balanceOf(SberAMM.address)).to.eq(mediumAmount.add(firstSwapAmountDAI));

        let amountAOut = ethers.utils.formatEther(balanceUSDT_t1.sub(balanceUSDT_t0));
        let amountAOutParseEther = ethers.utils.parseEther(amountAOut);

        console.log(`Was swap 25,000 DAI to ${amountAOut.substring(0, 7)} USDT`);

        let slippage = (((Number(firstSwapAmountDAI) - Number(amountAOutParseEther)) / Number(firstSwapAmountDAI)) * 100).toFixed(2);
        console.log("slippage:", slippage, "%");
    });

    it("Second PID: Add Liquidity", async () => {
        await USDT.connect(user0).approve(SberAMM.address, ethers.constants.MaxUint256);
        await DAI.connect(user0).approve(SberAMM.address, ethers.constants.MaxUint256);

        await SberAMM.connect(user0).deposit(secondPID, smallAmount, smallAmount);
    });

    it("Second PID: Stable Swap", async () => {
        console.log("Swap 55,000 USDT to DAI in liquidity pool with 85,000 DAI and 35,829 USDT");

        const balanceDAI_t0 = await DAI.balanceOf(user0.address);
        await SberAMM.connect(user0).swap(secondPID, USDT.address, swapAmountUSDT);
        const balanceDAI_t1 = await DAI.balanceOf(user0.address);
        let amountAOut = ethers.utils.formatEther(balanceDAI_t1.sub(balanceDAI_t0));
        let amountAOutParseEther = ethers.utils.parseEther(amountAOut);

        console.log(`Was swap 55,000 USDT to ${amountAOut.substring(0, 7)} DAI`);

        let slippage = (((Number(swapAmountUSDT) - Number(amountAOutParseEther)) / Number(swapAmountUSDT)) * 100).toFixed(2);
        console.log("slippage:", slippage, "%");
    });

    it("Second PID: Stable Swap", async () => {
        console.log("Swap 30,000 DAI to USDT in liquidity pool with 32,976 DAI and 90,829 USDT");
        const balanceUSDT_t0 = await USDT.balanceOf(user0.address);
        await SberAMM.connect(user0).swap(secondPID, DAI.address, secondSwapAmountDAI);
        const balanceUSDT_t1 = await USDT.balanceOf(user0.address);

        let amountAOut = ethers.utils.formatEther(balanceUSDT_t1.sub(balanceUSDT_t0));
        let amountAOutParseEther = ethers.utils.parseEther(amountAOut);

        console.log(`Was swap 30,000 DAI to ${amountAOut.substring(0, 7)} USDT`);

        let slippage = (((Number(secondSwapAmountDAI) - Number(amountAOutParseEther)) / Number(secondSwapAmountDAI)) * 100).toFixed(2);
        console.log("slippage:", slippage, "%");
    });

    it("Second PID: Withdraw and WithdrawFees", async () => {
        await SberAMM.withdrawFees(secondPID);
        expect(await SberAMM.viewEarnedFees(secondPID, DAI.address)).to.be.eq(0);
        expect(await SberAMM.viewEarnedFees(secondPID, USDT.address)).to.be.eq(0);
        await SberAMM.withdrawFees(secondPID);

        await SberAMM.connect(user0).withdrawFees(secondPID);
        expect(await SberAMM.connect(user0).viewEarnedFees(secondPID, DAI.address)).to.be.eq(0);
        expect(await SberAMM.connect(user0).viewEarnedFees(secondPID, USDT.address)).to.be.eq(0);
        await SberAMM.connect(user0).withdrawFees(secondPID);

        await SberAMM.withdraw(secondPID)
        await SberAMM.connect(user0).withdraw(secondPID)
        await expect(SberAMM.withdraw(secondPID)).to.be.revertedWith("No pool shares to withdraw");
        await expect(SberAMM.withdrawPreview(secondPID)).to.be.revertedWith("No pool shares to withdraw");
        await expect(SberAMM.connect(user0).withdraw(secondPID)).to.be.revertedWith("No pool shares to withdraw");
        await expect(SberAMM.connect(user0).withdrawPreview(secondPID)).to.be.revertedWith("No pool shares to withdraw");

        await expect(SberAMM.viewEarnedFees(secondPID, USDC.address)).to.be.revertedWith("No pool shares to withdraw fees");
        await expect(SberAMM.withdrawFees(secondPID)).to.be.revertedWith("No pool shares to withdraw fees");
        await expect(SberAMM.connect(user0).viewEarnedFees(secondPID, USDC.address)).to.be.revertedWith("No pool shares to withdraw fees");
        await expect(SberAMM.connect(user0).withdrawFees(secondPID)).to.be.revertedWith("No pool shares to withdraw fees");
    });

    it("Third PID: Add Liquidity", async () => {
        await DAI.connect(user2).approve(SberAMM.address, ethers.constants.MaxUint256);
        await WETH.connect(user2).approve(SberAMM.address, ethers.constants.MaxUint256);

        await SberAMM.connect(user2).deposit(thirdPID, largeAmount, wethAmount);
    });

    it("Third PID: Swap and Withdraw", async () => {
        console.log("Swap 50,000 DAI to WETH in liquidity pool with 100,000 DAI and 50 WETH");
        let ethPriceBeforeSwap = ethers.utils.formatEther(await SberAMM.exchangeRate(thirdPID, DAI.address))
        let ethPriceBeforeSwapParseEther = ethers.utils.parseEther(ethPriceBeforeSwap)
        console.log(`1 ETH = ${ethPriceBeforeSwap.substring(0, 4)} DAI`)

        expect(await DAI.balanceOf(user2.address)).to.eq(largeAmount.mul(3).sub(largeAmount));
        expect(await WETH.balanceOf(user2.address)).to.eq(smallAmount.mul(3).sub(wethAmount));
        expect(await DAI.balanceOf(SberAMM.address)).to.eq(largeAmount);
        expect(await WETH.balanceOf(SberAMM.address)).to.eq(wethAmount);
        const balanceWETH_t0 = await WETH.balanceOf(user2.address);
        await SberAMM.connect(user2).swap(thirdPID, DAI.address, mediumAmount);
        const balanceWETH_t1 = await WETH.balanceOf(user2.address);
        expect(await DAI.balanceOf(user2.address)).to.eq(largeAmount.mul(3).sub(mediumAmount).sub(largeAmount));
        expect(await DAI.balanceOf(SberAMM.address)).to.eq(largeAmount.add(mediumAmount));

        let ethPriceAfterSwap = ethers.utils.formatEther(await SberAMM.exchangeRate(thirdPID, DAI.address))
        let ethPriceAfterSwapParseEther = ethers.utils.parseEther(ethPriceAfterSwap)
        console.log(`1 ETH = ${ethPriceAfterSwap} DAI`)
        console.log(`1 ETH = ${ethPriceAfterSwapParseEther} DAI`)

        let amountWETH_out = ethers.utils.formatEther(balanceWETH_t1.sub(balanceWETH_t0));
        let amountWETH_outParseEther = ethers.utils.parseEther(amountWETH_out);
        expect(await WETH.balanceOf(user2.address)).to.eq(smallAmount.mul(3).sub(wethAmount).add(amountWETH_outParseEther));
        expect(await WETH.balanceOf(SberAMM.address)).to.eq(wethAmount.sub(amountWETH_outParseEther));

        console.log(`Was swap 50,000 DAI to ${amountWETH_out.substring(0, 7)} WETH`);

        let slippage1 = (((Number(mediumAmount) - Number(amountWETH_outParseEther)) / Number(mediumAmount)) * 100).toFixed(2);
        console.log("slippage1:", slippage1, "%");

        let slippage2 = ((((Number(mediumAmount) - Number(amountWETH_outParseEther)) * Number(ethPriceBeforeSwapParseEther)) / Number(mediumAmount)) * 100).toFixed(2)
        console.log("slippage2:", slippage2, "%");
        let slippage3 = ((((Number(mediumAmount) - Number(amountWETH_outParseEther)) * Number(ethPriceAfterSwapParseEther)) / Number(mediumAmount)) * 100).toFixed(2)
        console.log("slippage3:", slippage3, "%");
        console.log("\x1b[33m%s\x1b[0m", "slippage:",  (Math.abs(50000 - 16.63 * 2000) / (50000) * 100).toFixed(2), "%");

        await expect(SberAMM.totalValueLocked(4, USDT.address)).to.be.revertedWith("PID does not exist");
        await expect(SberAMM.exchangeRate(4, USDT.address)).to.be.revertedWith("PID does not exist");

        // expect(await SberAMM.viewEarnedFees(firstPID, DAI.address)).to.be.eq(mediumAmount.mul(3).div(1000)); // .mul(3).div(1000) == 0.003
        // expect(await SberAMM.viewEarnedFees(firstPID, WETH.address)).to.be.eq(0);
        // await SberAMM.withdrawFees(firstPID);
        // expect(await SberAMM.viewEarnedFees(firstPID, DAI.address)).to.be.eq(0);
        // expect(await SberAMM.viewEarnedFees(firstPID, WETH.address)).to.be.eq(0);
        // await SberAMM.withdrawFees(firstPID);

        // const tokensToWithdraw = await SberAMM.withdrawPreview(firstPID);
        // let DAIuserShareAfterSwap = largeAmount.add(mediumAmount); // 150,000 DAI
        // let DAIpairFee = mediumAmount.mul(3).div(1000); // 0.3% from swap amount
        // let DAIprotocolFee = DAIuserShareAfterSwap.sub(DAIpairFee).div(100); // -1% from withdraw amount
        // expect(tokensToWithdraw[0]).to.be.eq(DAIuserShareAfterSwap.sub(DAIpairFee).sub(DAIprotocolFee));
        // let DAIuserShareAfterSwap = largeAmount.sub(amountWETH_outParseEther); // 100,000 - 48,342 DAI
        // let DAIprotocolFee = DAIuserShareAfterSwap.div(100); // -1% from withdraw amount
        // expect(tokensToWithdraw[1]).to.be.eq(DAIuserShareAfterSwap.sub(DAIprotocolFee));
        // await SberAMM.withdraw(firstPID);
        // await expect(SberAMM.withdraw(firstPID)).to.be.revertedWith("No pool shares to withdraw");
        // await expect(SberAMM.withdrawPreview(firstPID)).to.be.revertedWith("No pool shares to withdraw");

        // await expect(SberAMM.viewEarnedFees(firstPID, WETH.address)).to.be.revertedWith("No pool shares to withdraw fees",);
        // await expect(SberAMM.withdrawFees(firstPID)).to.be.revertedWith("No pool shares to withdraw fees");
    });

    // it("Not stable swap", async () => {
    //     console.log("Swap 13.02 ETH to USDT in liquidity pool with 150,000 USDT and 33.37 ETH")
    //     let ethPriceBeforeSwap = ethers.utils.formatEther(await SberAMM.exchangeRate(secondPID, TokenC.address))
    //     console.log(`1 ETH = ${ethPriceBeforeSwap.substring(0, 4)} USDT`)

    //     const balanceA_t0 = await USDT.balanceOf(user1.address);
    //     const swapAmount = ethers.utils.parseEther("13.02");
    //     await SberAMM.connect(user1).swap(secondPID, TokenC.address, swapAmount);
    //     const balanceA_t1 = await USDT.balanceOf(user1.address);

    //     let ethPriceAfterSwap = ethers.utils.formatEther(await SberAMM.exchangeRate(secondPID, TokenC.address))
    //     console.log(`1 ETH = ${ethPriceAfterSwap.substring(0, 4)} USDT`)

    //     let amountAOut = ethers.utils.formatEther(balanceA_t1.sub(balanceA_t0));
    //     let amountAOutParseEther = ethers.utils.parseEther(amountAOut)
    //     console.log(`Was swap 13.02 ETH to ${(amountAOut.substring(0, 5))} USDT`)
       
    //     // let slippage = ((Number(swapAmount)*Number(ethPriceBeforeSwapParseEther) - Number(amountAOutParseEther)) / Number(swapAmount)*Number(ethPriceBeforeSwapParseEther) * 100).toFixed(2)
    //     // console.log("slippage:", slippage, "%");
    //     // let slippage2 = ((Number(swapAmount)*Number(ethPriceAfterSwap) - Number(amountAOutParseEther)) / Number(swapAmount)*Number(ethPriceAfterSwap) * 100).toFixed(2)
    //     // console.log("slippage2:", slippage2, "%");
    //     console.log("slippage:",  (Math.abs((13.02 * 4495 - 42011) / (13.02 * 4495)) * 100).toFixed(2), "%");
    // });

    // it("Not stable swap", async () => {
    //     console.log("Swap 3.62 ETH to USDT in liquidity pool with ? USDT and 46.39 ETH")
    //     let ethPriceBeforeSwap = ethers.utils.formatEther(await SberAMM.exchangeRate(secondPID, TokenC.address))
    //     console.log(`1 ETH = ${ethPriceBeforeSwap.substring(0, 4)} USDT`)

    //     const balanceA_t0 = await USDT.balanceOf(user1.address);
    //     const swapAmount = ethers.utils.parseEther("3.62");
    //     await SberAMM.connect(user1).swap(secondPID, TokenC.address, swapAmount);
    //     const balanceA_t1 = await USDT.balanceOf(user1.address);

    //     let ethPriceAfterSwap = ethers.utils.formatEther(await SberAMM.exchangeRate(secondPID, TokenC.address))
    //     console.log(`1 ETH = ${ethPriceAfterSwap.substring(0, 4)} USDT`)

    //     let amountAOut = ethers.utils.formatEther(balanceA_t1.sub(balanceA_t0));
    //     let amountAOutParseEther = ethers.utils.parseEther(amountAOut)
    //     console.log(`Was swap 3.62 ETH to ${(Number(amountAOut).toFixed(0))} USDT`)

    //     // let slippage = ((Number(swapAmount) - Number(amountAOutParseEther)*Number(ethPriceBeforeSwap)) / Number(swapAmount) * 100).toFixed(2)
    //     // console.log("slippage:", slippage, "%");
    //     // let slippage2 = ((Number(swapAmount) - Number(amountAOutParseEther)*Number(ethPriceAfterSwap)) / Number(swapAmount) * 100).toFixed(2)
    //     // console.log("slippage2:", slippage2, "%");
    //     console.log("slippage:",  (Math.abs(3.62 * 2003 - 7796) / (3.62 * 2003) * 100).toFixed(2), "%");

    //     let arr = await SberAMM.Pools(secondPID);
    //     console.log("USDT in pool %s", (BigInt(arr[2]) / BigInt(10n ** 18n)).toString())
    //     console.log("ETH in pool %s",(BigInt(arr[3]) / BigInt(10n ** 18n)).toString())
    // });
});
