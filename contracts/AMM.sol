// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import { UD60x18, ud } from "@prb/math/src/UD60x18.sol";

/// @title SberAMM 
/// @notice Sberbank Automated Market Maker 
contract SberAMM {
	using SafeERC20 for IERC20;

	// @dev struct for pool
	struct Pool {
		address token0;
		address token1;

		uint amount0;
		uint amount1;
        
        uint totalShares;

        bool isStable;
	}

    // @dev address token0 => address token1
    mapping(address => address) public getPair;

	// @dev struct for user liquidity position
	struct Position {
		uint amount0;
		uint amount1;
	}

	// @dev pool id => Pool struct
	mapping(uint => Pool) public Pools;

	// @dev array of pool ids
	uint public PIDs;

	// @dev user address => Position struct
	mapping(address => Position) public Positions;

    // @dev user address => PID => shares
    mapping (address => mapping (uint => uint)) public PoolShares;

    modifier pidExists(uint PID) {
        require(PID <= PIDs, "PID does not exist");
        _;
    }

	// @dev create pool
	function createPair(address tokenA, address tokenB, bool _isStable) external returns (uint) {
        require(tokenA != tokenB, 'two identical addresses');
        (address token0, address token1) = tokenA < tokenB ? (tokenA, tokenB) : (tokenB, tokenA);
        require(token0 != address(0), 'Zero Address');
        require(getPair[token0] != token1, 'Pair already exists'); 
        
		uint PID = PIDs;

		Pools[PID].token0 = token0;
		Pools[PID].token1 = token1;
		Pools[PID].isStable = _isStable;

        getPair[token0] = token1;
		PIDs++;

		return PID;
	}

    // @dev deposit tokens into pool and create liquidity position
    function deposit(uint PID, uint amount_token0, uint amount_token1) external pidExists(PID) {
        address token0 = Pools[PID].token0;
        address token1 = Pools[PID].token1;

        require(token0 != address(0), "not initialized X");
        require(token1 != address(0), "not initialized Y");

        IERC20(token0).safeTransferFrom(msg.sender, address(this), amount_token0);
        IERC20(token1).safeTransferFrom(msg.sender, address(this), amount_token1);

        UD60x18 liquidity = (ud(amount_token0).mul(ud(amount_token1))).sqrt();

        uint totalLiquidity = liquidity.unwrap();
        PoolShares[msg.sender][PID] += totalLiquidity;
        Pools[PID].totalShares += totalLiquidity;
        
        Pools[PID].amount0 += amount_token0;
        Pools[PID].amount1 += amount_token1;
    }

    // @dev withdraw tokens from pool and destroy liquidity position
    function withdraw(uint PID) external pidExists(PID) returns (uint, uint) {
        uint share = PoolShares[msg.sender][PID];
        require(share > 0, "No pool shares to withdraw");

        uint amount_token0 = ud(share).div(ud(Pools[PID].totalShares)).mul(ud(Pools[PID].amount0)).unwrap();
        uint amount_token1 = ud(share).div(ud(Pools[PID].totalShares)).mul(ud(Pools[PID].amount1)).unwrap();

        require(Pools[PID].amount0 >= amount_token0, "Insufficient pool balance for token0");
        require(Pools[PID].amount1 >= amount_token1, "Insufficient pool balance for token1");

        // Update the total amount of tokens in the pool
        Pools[PID].amount0 -= amount_token0;
        Pools[PID].amount1 -= amount_token1;

        // Update the total shares of the pool
        Pools[PID].totalShares -= share;

        // Burn the pool shares
        PoolShares[msg.sender][PID] = 0;

        // Transfer the tokens back to the user
        IERC20(Pools[PID].token0).safeTransfer(msg.sender, amount_token0);
        IERC20(Pools[PID].token1).safeTransfer(msg.sender, amount_token1);

        return (amount_token0, amount_token1);
    }

	// @dev hypothetical swap: 
	// x = 5
	// y = 10
	// k = x*y
	// dx = 1 
	// k = (x+1) * (y+dy)
	// 50 = (5+1) * (10+dy)
	// 50 = 6 * (10 + dy)
	// 50 = 60+6dy
	// -10 = 6dy
	// -10/6 = dy
	// -1.666
	// amountOut = (-dx * y) / (dx + x)

	// @dev swap tokens in pool
    function swap(uint PID, address tokenIn, uint amount) external pidExists(PID) returns (uint) {
        require(Pools[PID].isStable == false, "not x * y = k");
        require(IERC20(tokenIn).transferFrom(msg.sender, address(this), amount));
        
        address tokenOut = getOtherTokenAddr(PID, tokenIn);
        uint amountOut;

        uint fee = (ud(0.003e18) * ud(amount)).unwrap();
        uint amountMinusFee = amount - fee;

        if(Pools[PID].token0 == tokenIn) {
            // amount out Y
            // Pools[PID].amount0 += amount;
            amountOut = ud(amountMinusFee).mul(ud(Pools[PID].amount1)).div((ud(amountMinusFee) + ud(Pools[PID].amount0))).unwrap();
            Pools[PID].amount0 += amountMinusFee;

            Pools[PID].amount1 -= uint(amountOut);
        } else {
            // amount out X
            // Pools[PID].amount1 += amount;
            amountOut = ud(amountMinusFee).mul(ud(Pools[PID].amount0)).div((ud(amountMinusFee) + ud(Pools[PID].amount1))).unwrap();
            Pools[PID].amount1 += amountMinusFee;

            Pools[PID].amount0 -= uint(amountOut);
        }
        // transfer amount token out
        IERC20(tokenOut).safeTransfer(msg.sender, uint(amountOut));

        // Handle fee logic
        handleFees(PID, tokenIn, fee);
        
        return uint(amountOut);
    }

        
    function swapStable(uint PID, address tokenIn, uint amount) external returns (uint) {
        require(Pools[PID].isStable == true, "not x^2 * y^2 = k^2");
        require(IERC20(tokenIn).transferFrom(msg.sender, address(this), amount));
        
        address tokenOut = getOtherTokenAddr(PID, tokenIn);

        uint fee = (ud(0.003e18) * ud(amount)).unwrap();
        uint amountMinusFee = amount - fee;

        // Calculate the invariant k (square)
        uint kSquare = (ud(Pools[PID].amount0).pow(ud(2))).mul((ud(Pools[PID].amount1).pow(ud(2)))).unwrap();

        uint amountOut = calculateAmounts(PID, tokenIn, amountMinusFee, kSquare);

        // transfer amount token out
        IERC20(tokenOut).safeTransfer(msg.sender, uint(amountOut));

        // Handle fee logic
        handleFees(PID, tokenIn, fee);
        
        return uint(amountOut);
    }

    function calculateAmounts(uint PID, address tokenIn, uint amountMinusFee, uint kSquare) internal returns (uint) {
        uint newX;
        uint newY;
        uint amountOut;

        if(Pools[PID].token0 == tokenIn) {
            // amount out Y
            
            newX = Pools[PID].amount0 + amountMinusFee;
            newY = (ud(kSquare) / ud(newX).pow(ud(2))).sqrt().unwrap();
            amountOut = Pools[PID].amount1 - newY;

            Pools[PID].amount0 = newX;
            Pools[PID].amount1 = newY;
            
        } else {
            // amount out X
            
            newY = Pools[PID].amount1 + amountMinusFee;
            newX = (ud(kSquare) / ud(newY).pow(ud(2))).sqrt().unwrap();

            amountOut = Pools[PID].amount0 - newX;

            Pools[PID].amount0 = newX;
            Pools[PID].amount1 = newY;
        }
        return amountOut;
    }


    // A separate function to handle fees
    function handleFees(uint PID, address tokenIn, uint fee) private {
        // Distribute fees among liquidity providers
        if (Pools[PID].token0 == tokenIn) {
            Pools[PID].amount0 += fee;
        } else {
            Pools[PID].amount1 += fee;
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
	function totalValueLocked(uint PID, address token0) external view pidExists(PID) returns (uint rate, uint tvl) {
		address poolX = Pools[PID].token0;

		if (token0 == poolX) {
			uint amountX = Pools[PID].amount0;
			uint amountY = Pools[PID].amount1;

			rate = ud(amountX).div(ud(amountY)).unwrap();
			tvl = (ud(rate) * (ud(amountY)) + ud(amountX)).unwrap();
		} else {
			uint amountX = Pools[PID].amount1;
			uint amountY = Pools[PID].amount0;

			rate = (ud(amountX) / ud(amountY)).unwrap();
			tvl = (ud(rate).mul(ud(amountY)) + ud(amountX)).unwrap();
		}

		return (rate, tvl);
	}

	// @dev given pool id and token address, return the exchange rate
	function exchangeRate(uint PID, address token0) external view pidExists(PID) returns (uint rate) {
		address poolX = Pools[PID].token0;

		if (token0 == poolX) {
			uint amountX = Pools[PID].amount0;
			uint amountY = Pools[PID].amount1;

			rate = (ud(amountX) / ud(amountY)).unwrap();
		} else {
			uint amountX = Pools[PID].amount1;
			uint amountY = Pools[PID].amount0;

			rate = (ud(amountX) / ud(amountY)).unwrap();
		}
		return rate;
	}

	// @dev given a pool id and a token address, return the other token address
	function getOtherTokenAddr(uint PID, address token0) internal view pidExists(PID) returns (address token1) {
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