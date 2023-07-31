import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { expect } from "chai";
import { ethers } from "hardhat";
import { DividendToken, PaymentSplitter, SberAMM, Token } from "../typechain-types";

describe("SberAMM Unit Tests", () => {
    let signers: SignerWithAddress[];
    let admin: SignerWithAddress;
    let user0: SignerWithAddress;
    let user1: SignerWithAddress;
    let USDT: Token;
    let USDC: Token;
    let DAI: Token;
    let WETH: Token;
    let DividendToken: DividendToken;
    let Splitter: PaymentSplitter;
    let SberAMM: SberAMM;
    let firstPID: any;
    let secondPID: any;
    // let thirdPID: any;
    const protocolFee = ethers.utils.parseEther("0.01"); // 1%
    const pairFee = ethers.utils.parseEther("0.003"); // 0.3%
    const smallAmount = ethers.utils.parseEther("10000");
    const mediumAmount = ethers.utils.parseEther("50000");
    const largeAmount = ethers.utils.parseEther("100000");

    // second PID
    const firstSwapAmountDAI = ethers.utils.parseEther("25000");
    const secondSwapAmountDAI = ethers.utils.parseEther("30000");
    const swapAmountUSDT = ethers.utils.parseEther("55000");
    before(async () => {
        signers = await ethers.getSigners();
        admin = signers[0];
        user0 = signers[1];
        user1 = signers[2];
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

        await USDT.connect(user0).approve(SberAMM.address, ethers.constants.MaxUint256);
        await USDC.connect(user0).approve(SberAMM.address, ethers.constants.MaxUint256);
        await DAI.connect(user0).approve(SberAMM.address, ethers.constants.MaxUint256);
        await WETH.connect(user0).approve(SberAMM.address, ethers.constants.MaxUint256);
        await USDT.connect(user1).approve(SberAMM.address, ethers.constants.MaxUint256);
        await USDC.connect(user1).approve(SberAMM.address, ethers.constants.MaxUint256);
        await DAI.connect(user1).approve(SberAMM.address, ethers.constants.MaxUint256);
        await WETH.connect(user1).approve(SberAMM.address, ethers.constants.MaxUint256);

        expect(await USDT.balanceOf(user0.address)).to.eq(largeAmount.mul(3));
        expect(await USDC.balanceOf(user0.address)).to.eq(largeAmount.mul(3));
        expect(await DAI.balanceOf(user0.address)).to.eq(largeAmount.mul(3));
        expect(await WETH.balanceOf(user0.address)).to.eq(largeAmount.mul(3));
        expect(await USDT.balanceOf(user1.address)).to.eq(largeAmount.mul(3));
        expect(await USDC.balanceOf(user1.address)).to.eq(largeAmount.mul(3));
        expect(await DAI.balanceOf(user1.address)).to.eq(largeAmount.mul(3));
        expect(await WETH.balanceOf(user1.address)).to.eq(largeAmount.mul(3));
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
        // await SberAMM.createPair(DAI.address, WETH.address, pairFee, false);
        // thirdPID = await SberAMM.numberOfPools();
        // expect(thirdPID).to.equal(3);
    });

    it("Should Add Liquidity to Pairs", async () => {
        await USDT.approve(SberAMM.address, ethers.constants.MaxUint256);
        await USDC.approve(SberAMM.address, ethers.constants.MaxUint256);
        await DAI.approve(SberAMM.address, ethers.constants.MaxUint256);
        await WETH.approve(SberAMM.address, ethers.constants.MaxUint256);

        const wethAmount = ethers.utils.parseEther("50");

        await SberAMM.deposit(firstPID, largeAmount, largeAmount);
        await SberAMM.deposit(secondPID, mediumAmount, mediumAmount);
        // await SberAMM.deposit(thirdPID, largeAmount, wethAmount);
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

        let slippage = (
            ((Number(mediumAmount) - Number(amountUSDC_outParseEther)) / Number(mediumAmount)) *
            100
        ).toFixed(2);
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

        await expect(SberAMM.viewEarnedFees(firstPID, USDC.address)).to.be.revertedWith(
            "No pool shares to withdraw fees",
        );
        await expect(SberAMM.withdrawFees(firstPID)).to.be.revertedWith("No pool shares to withdraw fees");
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

        let slippage = (
            ((Number(firstSwapAmountDAI) - Number(amountAOutParseEther)) / Number(firstSwapAmountDAI)) *
            100
        ).toFixed(2);
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

        let slippage = (
            ((Number(swapAmountUSDT) - Number(amountAOutParseEther)) / Number(swapAmountUSDT)) *
            100
        ).toFixed(2);
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

        let slippage = (
            ((Number(secondSwapAmountDAI) - Number(amountAOutParseEther)) / Number(secondSwapAmountDAI)) *
            100
        ).toFixed(2);
        console.log("slippage:", slippage, "%");
    });

    it("Second PID (user0): Withdraw and WithdrawFees", async () => {
        let DAIsecondSwapFee = secondSwapAmountDAI.mul(3).div(1000); // 0.3% from swap amount
        let DAIshareUser0 = mediumAmount.add(smallAmount).div(smallAmount); // 10,000 from 60,000 total
        expect(await SberAMM.connect(user0).viewEarnedFees(secondPID, DAI.address)).to.be.eq(
            DAIsecondSwapFee.div(DAIshareUser0),
        );
        // expect(await SberAMM.connect(user0).viewEarnedFees(secondPID, USDT.address)).to.be.eq(swapAmountUSDT.mul(3).div(1000));
        await SberAMM.connect(user0).withdrawFees(secondPID);
        expect(await SberAMM.connect(user0).viewEarnedFees(secondPID, DAI.address)).to.be.eq(0);
        expect(await SberAMM.connect(user0).viewEarnedFees(secondPID, USDT.address)).to.be.eq(0);
        await SberAMM.connect(user0).withdrawFees(secondPID);

        // const tokensToWithdraw = await SberAMM.withdrawPreview(secondPID)
        // expect(tokensToWithdraw[0]).to.be.eq(
        //     largeAmount // 100,000 USDT (user's share in pair)
        //     .add(mediumAmount) // +50,000 USDT (user's share after swap)
        //     .sub((mediumAmount).mul(3).div(1000)) // -0.3% from swap amount (pairFee)
        //     .sub(largeAmount.add(mediumAmount).sub((mediumAmount).mul(3).div(1000)).div(100))) // -1% from withdraw amount (protocolFee)
        // expect(tokensToWithdraw[1]).to.be.eq(
        //     largeAmount // 100,000 USDT (user's share in pair)
        //     .sub(amountUSDC_outParseEther) // -48,342 USDT (user's share after swap)
        //     .sub(largeAmount.sub(amountUSDC_outParseEther).div(100))) // -1% from withdraw amount (protocolFee)
        // await SberAMM.withdraw(secondPID)
        // await expect(SberAMM.withdraw(secondPID)).to.be.revertedWith("No pool shares to withdraw");
        // await expect(SberAMM.withdrawPreview(secondPID)).to.be.revertedWith("No pool shares to withdraw");

        // await expect(SberAMM.viewEarnedFees(secondPID, USDC.address)).to.be.revertedWith("No pool shares to withdraw fees");
        // await expect(SberAMM.withdrawFees(secondPID)).to.be.revertedWith("No pool shares to withdraw fees");
    });
    /*
    it("Stable swap", async () => {
        console.log("Swap 28,342 USDC to USDT in liquidity pool with 130,269 USDT and 71,658 USDC")

        const balanceA_t0 = await USDT.balanceOf(user1.address);
        const swapAmount = ethers.utils.parseEther("28343");
        await SberAMM.connect(user1).swap(firstPID, USDC.address, swapAmount);
        const balanceA_t1 = await USDT.balanceOf(user1.address);

        let amountAOut = ethers.utils.formatEther(balanceA_t1.sub(balanceA_t0));
        let amountAOutParseEther = ethers.utils.parseEther(amountAOut)

        console.log(`Was swap 28,342 USDC to ${(amountAOut.substring(0, 5))} USDT`)

        let slippage = ((Number(swapAmount) - Number(amountAOutParseEther)) / Number(swapAmount) * 100).toFixed(2)
        console.log("slippage:", slippage, "%");
        
        let arr = await SberAMM.Pools(firstPID);
        console.log("USDT in pool %s", (BigInt(arr[2]) / BigInt(10n ** 18n)).toString())
        console.log("USDC in pool %s",(BigInt(arr[3]) / BigInt(10n ** 18n)).toString())

        console.log("USDT Fee %s", await SberAMM.viewEarnedFees(firstPID, USDT.address))
        console.log("USDC Fee %s", await SberAMM.viewEarnedFees(firstPID, USDC.address))
        await SberAMM.withdrawFees(firstPID)
        expect(await SberAMM.viewEarnedFees(firstPID, USDT.address)).to.be.eq(0);
        expect(await SberAMM.viewEarnedFees(firstPID, USDC.address)).to.be.eq(0);
        await expect(SberAMM.withdrawFees(firstPID)).to.be.revertedWith("Zero fees");

        console.log("USDT and USDC to withdraw %s", await SberAMM.withdrawPreview(firstPID))
        await SberAMM.withdraw(firstPID)
        // await expect(SberAMM.withdrawPreview(firstPID)).to.be.revertedWith("No pool shares to withdraw");

        // arr = await SberAMM.Pools(firstPID);
        // console.log("USDT in pool %s", (BigInt(arr[2]) / BigInt(10n ** 18n)).toString())
        // console.log("USDC in pool %s",(BigInt(arr[3]) / BigInt(10n ** 18n)).toString())

        // const previewParams = await SberAMM.withdrawPreview(firstPID)

        // const USDTbefore = ethers.utils.formatUnits(await USDT.balanceOf(admin.address))
        // const USDCbefore = ethers.utils.formatUnits(await USDC.balanceOf(admin.address))
        // await SberAMM.withdraw(firstPID)
        // const USDTafter = ethers.utils.formatUnits(await USDT.balanceOf(admin.address))
        // const USDCafter = ethers.utils.formatUnits(await USDC.balanceOf(admin.address))

        // const deltaA = (Number(USDTafter) - (Number(USDTbefore))).toFixed(1)
        // const deltaB = (Number(USDCafter) - (Number(USDCbefore))).toFixed(1)
        // expect(deltaA).to.eq(Number(ethers.utils.formatUnits(previewParams[0])).toFixed(1))
        // expect(deltaB).to.eq(Number(ethers.utils.formatUnits(previewParams[1])).toFixed(1))

        // console.log("Token A delta %s", deltaA)
        // console.log("Token B delta %s", deltaB)
    });

    // it("Withdraw from NOT stable", async () => {
    //     const previewParams = await SberAMM.withdrawPreview(firstPID)

    //     const USDTbefore = ethers.utils.formatUnits(await USDT.balanceOf(admin.address))
    //     const USDCbefore = ethers.utils.formatUnits(await USDC.balanceOf(admin.address))
    //     await SberAMM.withdraw(firstPID)
    //     const USDTafter = ethers.utils.formatUnits(await USDT.balanceOf(admin.address))
    //     const USDCafter = ethers.utils.formatUnits(await USDC.balanceOf(admin.address))

    //     const deltaA = (Number(USDTafter) - (Number(USDTbefore))).toFixed(1)
    //     const deltaB = (Number(USDCafter) - (Number(USDCbefore))).toFixed(1)
    //     expect(deltaA).to.eq(Number(ethers.utils.formatUnits(previewParams[0])).toFixed(1))
    //     expect(deltaB).to.eq(Number(ethers.utils.formatUnits(previewParams[1])).toFixed(1))

    //     console.log("Token A delta %s", deltaA)
    //     console.log("Token B delta %s", deltaB)
    // });
/*
    it("Not stable swap", async () => {
        console.log("Swap 50,000 USDT to ETH in liquidity pool with 100,000 USDT and 50 ETH")
        let ethPriceBeforeSwap = ethers.utils.formatEther(await SberAMM.exchangeRate(secondPID, TokenC.address))
        console.log(`1 ETH = ${ethPriceBeforeSwap.substring(0, 4)} USDT`)

        // const balanceA_t0 = await USDT.balanceOf(user0.address);
        const balanceC_t0 = await TokenC.balanceOf(user0.address);
        // console.log("Balance A before swap %s", balanceA_t0)
        // console.log("Balance C before swap %s", balanceC_t0)
        await SberAMM.connect(user0).swap(secondPID, USDT.address, mediumAmount);
        // const balanceA_t1 = await USDT.balanceOf(user0.address);
        const balanceC_t1 = await TokenC.balanceOf(user0.address);
        // console.log("Balance A after swap %s", balanceA_t1)
        // console.log("Balance C after swap %s", balanceC_t1)

        let ethPriceAfterSwap = ethers.utils.formatEther(await SberAMM.exchangeRate(secondPID, TokenC.address))
        console.log(`1 ETH = ${ethPriceAfterSwap.substring(0, 4)} USDT`)

        let amountCOut = ethers.utils.formatEther(balanceC_t1.sub(balanceC_t0));
        let amountCOutParseEther = ethers.utils.parseEther(amountCOut)
        console.log(`Was swap 50,000 USDT to ${(amountCOut.substring(0, 5))} ETH`)

        // let slippage = ((Number(mediumAmount) - Number(amountCOutParseEther)*Number(ethPriceBeforeSwap)) / Number(mediumAmount) * 100).toFixed(2)
        // console.log("slippage:", slippage, "%");
        // let slippage2 = ((Number(mediumAmount) - Number(amountCOutParseEther)*Number(ethPriceAfterSwap)) / Number(mediumAmount) * 100).toFixed(2)
        // console.log("slippage2:", slippage2, "%");
        console.log("\x1b[33m%s\x1b[0m", "slippage:",  (Math.abs(50000 - 16.63 * 2000) / (50000) * 100).toFixed(2), "%");
    });

    it("Not stable swap", async () => {
        console.log("Swap 13.02 ETH to USDT in liquidity pool with 150,000 USDT and 33.37 ETH")
        let ethPriceBeforeSwap = ethers.utils.formatEther(await SberAMM.exchangeRate(secondPID, TokenC.address))
        console.log(`1 ETH = ${ethPriceBeforeSwap.substring(0, 4)} USDT`)

        const balanceA_t0 = await USDT.balanceOf(user1.address);
        const swapAmount = ethers.utils.parseEther("13.02");
        await SberAMM.connect(user1).swap(secondPID, TokenC.address, swapAmount);
        const balanceA_t1 = await USDT.balanceOf(user1.address);

        let ethPriceAfterSwap = ethers.utils.formatEther(await SberAMM.exchangeRate(secondPID, TokenC.address))
        console.log(`1 ETH = ${ethPriceAfterSwap.substring(0, 4)} USDT`)

        let amountAOut = ethers.utils.formatEther(balanceA_t1.sub(balanceA_t0));
        let amountAOutParseEther = ethers.utils.parseEther(amountAOut)
        console.log(`Was swap 13.02 ETH to ${(amountAOut.substring(0, 5))} USDT`)
       
        // let slippage = ((Number(swapAmount)*Number(ethPriceBeforeSwapParseEther) - Number(amountAOutParseEther)) / Number(swapAmount)*Number(ethPriceBeforeSwapParseEther) * 100).toFixed(2)
        // console.log("slippage:", slippage, "%");
        // let slippage2 = ((Number(swapAmount)*Number(ethPriceAfterSwap) - Number(amountAOutParseEther)) / Number(swapAmount)*Number(ethPriceAfterSwap) * 100).toFixed(2)
        // console.log("slippage2:", slippage2, "%");
        console.log("slippage:",  (Math.abs((13.02 * 4495 - 42011) / (13.02 * 4495)) * 100).toFixed(2), "%");
    });

    it("Not stable swap", async () => {
        console.log("Swap 3.62 ETH to USDT in liquidity pool with ? USDT and 46.39 ETH")
        let ethPriceBeforeSwap = ethers.utils.formatEther(await SberAMM.exchangeRate(secondPID, TokenC.address))
        console.log(`1 ETH = ${ethPriceBeforeSwap.substring(0, 4)} USDT`)

        const balanceA_t0 = await USDT.balanceOf(user1.address);
        const swapAmount = ethers.utils.parseEther("3.62");
        await SberAMM.connect(user1).swap(secondPID, TokenC.address, swapAmount);
        const balanceA_t1 = await USDT.balanceOf(user1.address);

        let ethPriceAfterSwap = ethers.utils.formatEther(await SberAMM.exchangeRate(secondPID, TokenC.address))
        console.log(`1 ETH = ${ethPriceAfterSwap.substring(0, 4)} USDT`)

        let amountAOut = ethers.utils.formatEther(balanceA_t1.sub(balanceA_t0));
        let amountAOutParseEther = ethers.utils.parseEther(amountAOut)
        console.log(`Was swap 3.62 ETH to ${(Number(amountAOut).toFixed(0))} USDT`)

        // let slippage = ((Number(swapAmount) - Number(amountAOutParseEther)*Number(ethPriceBeforeSwap)) / Number(swapAmount) * 100).toFixed(2)
        // console.log("slippage:", slippage, "%");
        // let slippage2 = ((Number(swapAmount) - Number(amountAOutParseEther)*Number(ethPriceAfterSwap)) / Number(swapAmount) * 100).toFixed(2)
        // console.log("slippage2:", slippage2, "%");
        console.log("slippage:",  (Math.abs(3.62 * 2003 - 7796) / (3.62 * 2003) * 100).toFixed(2), "%");

        let arr = await SberAMM.Pools(secondPID);
        console.log("USDT in pool %s", (BigInt(arr[2]) / BigInt(10n ** 18n)).toString())
        console.log("ETH in pool %s",(BigInt(arr[3]) / BigInt(10n ** 18n)).toString())
    });
    
    /*
    it("Should Execute NOT Stable Swap", async () => {
        const rate0 = Number(await SberAMM.exchangeRate(firstPID, C.address));
        const balanceB_t0 = await USDC.balanceOf(user0.address);
        console.log("Balance B before swap %s", balanceB_t0)

        await SberAMM.connect(user0).swap(firstPID, USDT.address, mediumAmount);

        const rate1 = Number(await SberAMM.exchangeRate(firstPID, USDT.address));
        const balanceB_t1 = await USDC.balanceOf(user0.address);
        console.log("Balance B after swap %s", balanceB_t1)

        let amountBOut = ethers.utils.formatEther(balanceB_t1.sub(balanceB_t0));

        console.log("slippage:",  Math.abs((Number(balanceB_t1) - Number(balanceB_t0)) / Number(balanceB_t1) * 100).toFixed(3), "%");
        console.log("Amount B out: ", Number(amountBOut).toFixed(2));
    });

    it("Should Execute Stable Swap", async () => {
        const rate0 = Number(await SberAMM.exchangeRate(secondPID, USDT.address));
        const balanceC_t0 = await TokenC.balanceOf(user0.address);
        console.log("Balance C before swap %s", balanceC_t0)

        await SberAMM.connect(user0).swap(secondPID, USDT.address, mediumAmount);

        const rate1 = Number(await SberAMM.exchangeRate(secondPID, USDT.address));
        const balanceC_t1 = await TokenC.balanceOf(user0.address);
        console.log("Balance C after swap %s", balanceC_t1)

        let amountCOut = ethers.utils.formatEther(balanceC_t1.sub(balanceC_t0));

        console.log("slippage:",  Math.abs((Number(balanceC_t1) - Number(balanceC_t0)) / Number(balanceC_t1) * 100).toFixed(3), "%");
        console.log("Amount C out: ", Number(amountCOut).toFixed(2));
        console.log("Oracle Price change on 2 PID:", (((rate1 - rate0) / rate1) * 100).toFixed(3), "%");
        console.log("ExchangeRate USDT on 2 PID: %s", ethers.utils.formatUnits(await SberAMM.exchangeRate(secondPID, USDT.address)));
        console.log("ExchangeRate USDC on 2 PID: %s", ethers.utils.formatUnits(await SberAMM.exchangeRate(secondPID, USDC.address)));
        console.log("TVL USDT on 2 PID: %s", ethers.utils.formatUnits(await SberAMM.totalValueLocked(secondPID, USDT.address)))
        console.log("TVL USDC on 2 PID: %s", ethers.utils.formatUnits(await SberAMM.totalValueLocked(secondPID, USDC.address)))
    });

    it("Withdraw from NOT stable", async () => {
        const previewParams = await SberAMM.withdrawPreview(firstPID)

        const USDTbefore = ethers.utils.formatUnits(await USDT.balanceOf(admin.address))
        const USDCbefore = ethers.utils.formatUnits(await USDC.balanceOf(admin.address))
        await SberAMM.withdraw(firstPID)
        const USDTafter = ethers.utils.formatUnits(await USDT.balanceOf(admin.address))
        const USDCafter = ethers.utils.formatUnits(await USDC.balanceOf(admin.address))

        const deltaA = (Number(USDTafter) - (Number(USDTbefore))).toFixed(1)
        const deltaB = (Number(USDCafter) - (Number(USDCbefore))).toFixed(1)
        expect(deltaA).to.eq(Number(ethers.utils.formatUnits(previewParams[0])).toFixed(1))
        expect(deltaB).to.eq(Number(ethers.utils.formatUnits(previewParams[1])).toFixed(1))

        console.log("Token A delta %s", deltaA)
        console.log("Token B delta %s", deltaB)
    });

    it("WithdrawFees from stable", async () => {
        const previewParamsFeeA = await SberAMM.viewEarnedFees(secondPID, USDT.address)
        const previewParamsFeeC = await SberAMM.viewEarnedFees(secondPID, TokenC.address)

        const USDTbeforeFee = ethers.utils.formatUnits(await USDT.balanceOf(admin.address))
        const tokenCbeforeFee = ethers.utils.formatUnits(await TokenC.balanceOf(admin.address))
        await SberAMM.withdrawFees(secondPID)
        const USDTafterFee = ethers.utils.formatUnits(await USDT.balanceOf(admin.address))
        const tokenCafterFee = ethers.utils.formatUnits(await TokenC.balanceOf(admin.address))

        const deltaAFee = (Number(USDTafterFee) - (Number(USDTbeforeFee))).toFixed(1)
        const deltaCFee = (Number(tokenCafterFee) - (Number(tokenCbeforeFee))).toFixed(1)
        expect(deltaAFee).to.eq(Number(ethers.utils.formatUnits(previewParamsFeeA)).toFixed(1))
        expect(deltaCFee).to.eq(Number(ethers.utils.formatUnits(previewParamsFeeC)).toFixed(1))

        console.log("Token A Fee delta %s", deltaAFee)
        console.log("Token C Fee delta %s", deltaCFee)
    });

    it("Should Check All Possible Reverts", async () => {
        await expect(SberAMM.createPair(USDT.address, USDT.address, pairFee, false)).to.be.revertedWith("two identical addresses");
        await expect(SberAMM.createPair(ethers.constants.AddressZero, USDC.address, pairFee, false)).to.be.revertedWith("Zero Address USDT");
        await expect(SberAMM.createPair(USDT.address, ethers.constants.AddressZero, pairFee, false)).to.be.revertedWith("Zero Address USDC");
        await expect(SberAMM.createPair(USDT.address, TokenC.address, pairFee, true)).to.be.revertedWith("Pair already exists");

        await expect(SberAMM.deposit(4, mediumAmount, mediumAmount)).to.be.revertedWith("PID does not exist");

        await expect(SberAMM.swap(4, USDT.address, mediumAmount)).to.be.revertedWith("PID does not exist");
        await expect(SberAMM.swap(firstPID, TokenC.address, mediumAmount)).to.be.revertedWith("Address: call to non-contract");

        await expect(SberAMM.withdraw(4)).to.be.revertedWith("PID does not exist");
        await expect(SberAMM.withdraw(firstPID)).to.be.revertedWith("No pool shares to withdraw");
        await expect(SberAMM.withdrawPreview(firstPID)).to.be.revertedWith("No pool shares to withdraw");
        await expect(SberAMM.withdrawPreview(4)).to.be.revertedWith("PID does not exist");
        await expect(SberAMM.withdrawFees(4)).to.be.revertedWith("PID does not exist");
        await expect(SberAMM.withdrawFees(secondPID)).to.be.revertedWith("No shares found for the user");
        await expect(SberAMM.viewEarnedFees(secondPID, TokenC.address)).to.be.revertedWith("No shares found for the user");
        await expect(SberAMM.viewEarnedFees(4, USDT.address)).to.be.revertedWith("PID does not exist");

        await expect(SberAMM.totalValueLocked(4, USDT.address)).to.be.revertedWith("PID does not exist");
        await expect(SberAMM.exchangeRate(4, USDT.address)).to.be.revertedWith("PID does not exist");
    });*/
});
