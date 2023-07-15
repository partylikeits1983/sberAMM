// SPDX-License-Identifier: BSD-3-Clause
// Authors: Alexander John Lee & Mikhail Bolshakov

pragma solidity ^0.8.19;

import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {UD60x18, ud} from "@prb/math/src/UD60x18.sol";
import {SD59x18, sd} from "@prb/math/src/SD59x18.sol";

import "./Admin.sol";

/// @title SberAMM
/// @notice Sberbank Automated Market Maker
contract SberAMM is Admin {
    using SafeERC20 for IERC20;

    // @dev struct for pool
    struct Pool {
        address token0;
        address token1;
        uint amount0;
        uint amount1;
        uint totalShares;
        bool isStable;
        uint fee0;
        uint fee1;
        uint feeRate;
    }
    // @dev struct for user liquidity position
    struct Position {
        uint amount0;
        uint amount1;
    }
    // @dev keeping track of historical fees withdrawn by user
    struct Fee {
        uint fee0;
        uint fee1;
    }

    // @dev address token0 => address token1 => fee uint => PID
    // @gev gets the PoolID given addresses & fee amount
    mapping(address => mapping(address => mapping(uint => mapping(bool => uint)))) public getPool;

    // @dev pool id => Pool struct
    mapping(uint => Pool) public Pools;

    // @dev array of pool ids
    uint public PIDs;

    // PID => address user => Fee
    mapping(uint => mapping(address => Fee)) Fees;

    // @dev user address => PID => shares
    mapping(address => mapping(uint => uint)) public PoolShares;

    constructor() {
        admin = msg.sender;
    }

    modifier pidExists(uint PID) {
        require(PID <= PIDs, "PID does not exist");
        _;
    }

    // @dev create pool
    function createPair(
        address token0,
        address token1,
        uint _fee,
        bool _isStable
    ) external returns (uint) {
        require(token0 != token1, "two identical addresses");
        require(token0 != address(0), "Zero Address tokenA");
        require(token1 != address(0), "Zero Address tokenB");
        require(getPool[token0][token1][_fee][_isStable] == 0, "Pair already exists");

        PIDs++;
        uint PID = PIDs;

        Pools[PID].token0 = token0;
        Pools[PID].token1 = token1;
        Pools[PID].feeRate = _fee;
        Pools[PID].isStable = _isStable;

        getPool[token0][token1][_fee][_isStable] = PIDs;
        getPool[token1][token0][_fee][_isStable] = PIDs;

        return PID;
    }

    // @dev deposit tokens into pool and create liquidity position
    function deposit(uint PID, uint amount_token0, uint amount_token1) external pidExists(PID) {
        address token0 = Pools[PID].token0;
        address token1 = Pools[PID].token1;

        IERC20(token0).safeTransferFrom(msg.sender, address(this), amount_token0);
        IERC20(token1).safeTransferFrom(msg.sender, address(this), amount_token1);

        uint totalLiquidity = (ud(amount_token0).mul(ud(amount_token1))).sqrt().unwrap();

        PoolShares[msg.sender][PID] += totalLiquidity;
        Pools[PID].totalShares += totalLiquidity;

        Pools[PID].amount0 += amount_token0;
        Pools[PID].amount1 += amount_token1;
    }

    // @dev withdraw tokens from pool and destroy liquidity position
    function withdraw(uint PID) external pidExists(PID) returns (uint, uint) {
        uint share = PoolShares[msg.sender][PID];
        require(share > 0, "No pool shares to withdraw");

        uint amount_token0 = ud(share)
            .div(ud(Pools[PID].totalShares))
            .mul(ud(Pools[PID].amount0))
            .unwrap();
        uint amount_token1 = ud(share)
            .div(ud(Pools[PID].totalShares))
            .mul(ud(Pools[PID].amount1))
            .unwrap();

        require(Pools[PID].amount0 >= amount_token0, "Insufficient pool balance for token0");
        require(Pools[PID].amount1 >= amount_token1, "Insufficient pool balance for token1");

        // Calculate the protocol fee
        uint protocol_fee_token0 = ud(amount_token0).mul(ud(0.01e18)).unwrap();
        uint protocol_fee_token1 = ud(amount_token1).mul(ud(0.01e18)).unwrap();

        // Update the total amount of tokens in the pool
        Pools[PID].amount0 -= amount_token0;
        Pools[PID].amount1 -= amount_token1;

        // Subtract the protocol fee from the amount to be transferred
        amount_token0 -= protocol_fee_token0;
        amount_token1 -= protocol_fee_token1;

        // Update the total shares of the pool
        Pools[PID].totalShares -= share;

        // Burn the pool shares
        PoolShares[msg.sender][PID] = 0;

        // Transfer the tokens back to the user
        IERC20(Pools[PID].token0).safeTransfer(msg.sender, amount_token0);
        IERC20(Pools[PID].token1).safeTransfer(msg.sender, amount_token1);

        // Transfer the protocol fee
        IERC20(Pools[PID].token0).safeTransfer(dividendPayingERC20, protocol_fee_token0);
        IERC20(Pools[PID].token1).safeTransfer(dividendPayingERC20, protocol_fee_token1);

        return (amount_token0, amount_token1);
    }

    // @dev withdraw tokens from pool and destroy liquidity position
    function withdrawPreview(uint PID) external view pidExists(PID) returns (uint, uint) {
        uint share = PoolShares[msg.sender][PID];
        require(share > 0, "No pool shares to withdraw");

        uint amount_token0 = ud(share)
            .div(ud(Pools[PID].totalShares))
            .mul(ud(Pools[PID].amount0))
            .unwrap();
        uint amount_token1 = ud(share)
            .div(ud(Pools[PID].totalShares))
            .mul(ud(Pools[PID].amount1))
            .unwrap();

        require(Pools[PID].amount0 >= amount_token0, "Insufficient pool balance for token0");
        require(Pools[PID].amount1 >= amount_token1, "Insufficient pool balance for token1");

        // Calculate the protocol fee
        uint protocol_fee_token0 = ud(amount_token0).mul(ud(0.01e18)).unwrap();
        uint protocol_fee_token1 = ud(amount_token1).mul(ud(0.01e18)).unwrap();

        // Subtract the protocol fee from the amount to be transferred
        amount_token0 -= protocol_fee_token0;
        amount_token1 -= protocol_fee_token1;

        return (amount_token0, amount_token1);
    }

    // @dev swap tokens in pool
    // amountOutY = (-amountInX * y) / (amountInX + x)

    // @dev swap tokens in pool using modified xy=k formula
    // @dev uses the function: amountOutY = log(-amountInX * y / (amountInX + x))

    function swap(uint PID, address tokenIn, uint amount) external pidExists(PID) returns (uint) {
        require(IERC20(tokenIn).transferFrom(msg.sender, address(this), amount));

        address tokenOut = _getOtherTokenAddr(PID, tokenIn);
        uint fee = (ud(Pools[PID].feeRate) * ud(amount)).unwrap();
        uint amountMinusFee = amount - fee;
        uint amountOut = _calculateAmounts(PID, tokenIn, amountMinusFee);

        handleFees(PID, tokenIn, fee);
        IERC20(tokenOut).safeTransfer(msg.sender, uint(amountOut));

        return uint(amountOut);
    }

    function _calculateAmounts(
        uint PID,
        address tokenIn,
        uint amountMinusFee
    ) internal returns (uint) {
        uint amountOut;

        if (Pools[PID].isStable) {
            if (Pools[PID].token0 == tokenIn) {
                amountOut = swapQuoteFunc(Pools[PID].amount0, Pools[PID].amount1, amountMinusFee);

                Pools[PID].amount0 += amountMinusFee;
                Pools[PID].amount1 -= amountOut;
            } else {
                amountOut = swapQuoteFunc(Pools[PID].amount1, Pools[PID].amount0, amountMinusFee);

                Pools[PID].amount1 += amountMinusFee;
                Pools[PID].amount0 -= amountOut;
            }
        } else {
            if (Pools[PID].token0 == tokenIn) {
                amountOut = ud(amountMinusFee)
                    .mul(ud(Pools[PID].amount1))
                    .div((ud(amountMinusFee) + ud(Pools[PID].amount0)))
                    .unwrap();
                Pools[PID].amount0 += amountMinusFee;
                Pools[PID].amount1 -= uint(amountOut);
            } else {
                amountOut = ud(amountMinusFee)
                    .mul(ud(Pools[PID].amount0))
                    .div((ud(amountMinusFee) + ud(Pools[PID].amount1)))
                    .unwrap();
                Pools[PID].amount1 += amountMinusFee;
                Pools[PID].amount0 -= uint(amountOut);
            }
        }
        return amountOut;
    }

    /**
     * @notice stableswap equation
     * @param Ax asset of token x
     * @param Ay asset of token y
     * @param Dx delta x, i.e. token x amount inputted
     * @return quote The quote for amount of token y swapped for token x amount inputted
     */
    function swapQuoteFunc(uint256 Ax, uint256 Ay, uint256 Dx) public pure returns (uint256 quote) {
        // @dev Amplification factor
        uint A = 250000000000000; // make this a global variable

        // casting
        SD59x18 _ax = sd(int(Ax));
        SD59x18 _ay = sd(int(Ay));
        SD59x18 _dx = sd(int(Dx));
        SD59x18 _a = sd(int(A));

        // this can be simplified...
        SD59x18 D = _ax + _ay - _a.mul((_ax * _ax) / _ax + (_ay * _ay) / _ay); // flattened _invariantFunc
        SD59x18 rx_ = (_ax + _dx).div(_ax);
        SD59x18 b = (_ax * (rx_ - _a.div(rx_))) / _ay - D.div(_ay); // flattened _coefficientFunc
        SD59x18 ry_ = _solveQuad(b, _a);
        SD59x18 Dy = _ay.mul(ry_) - _ay;

        return uint(Dy.abs().unwrap());
    }

    function _solveQuad(SD59x18 b, SD59x18 c) internal pure returns (SD59x18) {
        return (((b.mul(b)) + (c.mul(sd(4e18)))).sqrt().sub(b)).div(sd(2e18));
    }

    function withdrawFees(uint PID, address token) external pidExists(PID) returns (uint) {
        Pool storage pool = Pools[PID];
        uint totalFee = (token == pool.token0) ? pool.fee0 : pool.fee1;

        uint share = PoolShares[msg.sender][PID];
        require(share > 0, "No shares found for the user");

        Fee memory userFees = Fees[PID][msg.sender];
        uint lastWithdrawnFee = (token == pool.token0) ? userFees.fee0 : userFees.fee1;

        uint fee = ud(totalFee)
            .sub(ud(lastWithdrawnFee))
            .mul(ud(share))
            .div(ud(pool.totalShares))
            .unwrap();

        IERC20(token).safeTransfer(msg.sender, fee);

        return fee;
    }

    // @dev separate function to handle fees
    function handleFees(uint PID, address tokenIn, uint fee) private {
        // Distribute fees among liquidity providers
        if (Pools[PID].token0 == tokenIn) {
            Pools[PID].amount0 += fee;
            Pools[PID].fee0 += fee;
        } else {
            Pools[PID].amount1 += fee;
            Pools[PID].fee1 += fee;
        }
    }

    // VIEW FUNCTIONS
    // X * Y = K

    // pool = 10x & 5y
    // 2x = 1y

    // exchange rate = (10x / 5y)
    // exchange_rate = 2
    // 2 * amount y + amount x = 20
    // TVL = 20x

    // @dev given pool id and token address, return the exchange rate and total value locked
    function totalValueLocked(
        uint PID,
        address token0
    ) external view pidExists(PID) returns (uint tvl) {
        address poolX = Pools[PID].token0;

        if (token0 == poolX) {
            uint amountX = Pools[PID].amount0;
            uint amountY = Pools[PID].amount1;

            uint rate = ud(amountX).div(ud(amountY)).unwrap();
            tvl = (ud(rate) * (ud(amountY)) + ud(amountX)).unwrap();
        } else {
            uint amountX = Pools[PID].amount1;
            uint amountY = Pools[PID].amount0;

            uint rate = ud(amountX).div(ud(amountY)).unwrap();
            tvl = (ud(rate).mul(ud(amountY)) + ud(amountX)).unwrap();
        }

        return tvl;
    }

    function viewEarnedFees(uint PID, address token) external view pidExists(PID) returns (uint) {
        Pool storage pool = Pools[PID];
        uint totalFee = (token == pool.token0) ? pool.fee0 : pool.fee1;

        uint share = PoolShares[msg.sender][PID];
        require(share > 0, "No shares found for the user");

        Fee memory userFees = Fees[PID][msg.sender];
        uint lastWithdrawnFee = (token == pool.token0) ? userFees.fee0 : userFees.fee1;

        uint fee = ud(totalFee)
            .sub(ud(lastWithdrawnFee))
            .mul(ud(share))
            .div(ud(pool.totalShares))
            .unwrap();

        return fee;
    }

    // @dev given pool id and token address, return the exchange rate
    function exchangeRate(
        uint PID,
        address token0
    ) external view pidExists(PID) returns (uint rate) {
        address poolX = Pools[PID].token0;

        if (token0 == poolX) {
            uint amountX = Pools[PID].amount0;
            uint amountY = Pools[PID].amount1;

            rate = ud(amountX).div(ud(amountY)).unwrap();
        } else {
            uint amountX = Pools[PID].amount1;
            uint amountY = Pools[PID].amount0;

            rate = ud(amountX).div(ud(amountY)).unwrap();
        }
        return rate;
    }

    // @dev given a pool id and a token address, return the other token address
    function _getOtherTokenAddr(uint PID, address token0) internal view returns (address token1) {
        address poolX = Pools[PID].token0;
        address poolY = Pools[PID].token1;

        if (token0 == poolX) {
            token1 = poolY;
        }
        if (token0 == poolY) {
            token1 = poolX;
        }
        return token1;
    }

    // @dev get number of pools in contract
    function numberOfPools() external view returns (uint) {
        return PIDs;
    }
}
