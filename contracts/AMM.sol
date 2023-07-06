// SPDX-License-Identifier: MIT
pragma solidity ^0.8.17;

import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "./libraries/Math.sol";

/// @title SimpleAMM 
/// @author Alexander John Lee
/// @notice CFMM Proof of Concept 

contract AMM {
	using SD for int256;
	using SafeERC20 for IERC20; 

	// @dev struct for pool
	struct Pool {
		address token0;
		address token1;

		uint amount0;
		uint amount1;
	}

	// @dev struct for user liquidity position
	struct Position {
		uint amount0;
		uint amount1;
	}

	// @dev pool id => Pool struct
	mapping(uint => Pool) public Pools;

	// @dev array of pool ids
	uint[] public PIDs;

	// @dev user address => Position struct
	mapping(address => Position) public Positions;


	// @dev create pool
	function createPool(address token0, address token1) public returns (uint) {
		uint PID = PIDs.length;

		Pools[PID].token0 = token0;
		Pools[PID].token1 = token1;

		PIDs.push(PID);

		return PID;
	}

	// @dev deposit tokens into pool and create liquidity position
	function deposit(uint PID, uint amount_token0, uint amount_token1) public {
		address token0 = Pools[PID].token0;
		address token1 = Pools[PID].token1;

		require(token0 != address(0), "not initialized X");
		require(token1 != address(0), "not initialized Y");

		IERC20(token0).safeTransferFrom(msg.sender, address(this), amount_token0);
		IERC20(token1).safeTransferFrom(msg.sender, address(this), amount_token1);

		Pools[PID].amount0 += amount_token0;
		Pools[PID].amount1 += amount_token1;

		Positions[msg.sender].amount0 = amount_token0;
		Positions[msg.sender].amount1 = amount_token1;
	}

	// @dev withdraw tokens from pool and destroy liquidity position
	function withdraw() public {
		// TODO
		// @dev withdraw tokens from pool without affecting the exchange rate
		/*
		uint token_0_amount = Positions[msg.sender].amount0;
		uint token_1_amount = Positions[msg.sender].amount1;
		*/
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
	function swap(uint PID, address tokenIn, uint amount) public returns (uint) {
		require(IERC20(tokenIn).transferFrom(msg.sender, address(this), amount));

		address tokenOut = getOtherTokenAddr(PID, tokenIn);
		int amountOut;

		if(Pools[PID].token0 == tokenIn) {
			// amount out Y
			// Pools[PID].amount0 += amount;
			amountOut = int(amount).mul(int(Pools[PID].amount1)).div(int(amount + Pools[PID].amount0));
			Pools[PID].amount0 += amount;

			Pools[PID].amount1 -= uint(amountOut);
		} else {
			// amount out X
			// Pools[PID].amount1 += amount;
			amountOut = int(amount).mul(int(Pools[PID].amount0)).div(int(amount + Pools[PID].amount1));
			Pools[PID].amount1 += amount;

			Pools[PID].amount0 -= uint(amountOut);
		}
		// transfer amount token out
		IERC20(tokenOut).safeTransfer(msg.sender, uint(amountOut));

		return uint(amountOut);
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
	function totalValueLocked(uint PID, address token0) public view returns (int rate, int tvl) {
		address poolX = Pools[PID].token0;

		if (token0 == poolX) {
			int amountX = int(Pools[PID].amount0);
			int amountY = int(Pools[PID].amount1);

			rate = amountX.div(amountY);
			tvl = rate.mul(amountY) + amountX;
		} else {
			int amountX = int(Pools[PID].amount1);
			int amountY = int(Pools[PID].amount0);

			rate = amountX.div(amountY);
			tvl = rate.mul(amountY) + amountX;
		}

		return (rate, tvl);
	}


	// @dev given pool id and token address, return the exchange rate
	function exchangeRate(uint PID, address token0) public view returns (uint rate) {
		address poolX = Pools[PID].token0;

		if (token0 == poolX) {
			int amountX = int(Pools[PID].amount0);
			int amountY = int(Pools[PID].amount1);

			rate = uint(amountX.div(amountY));
		} else {
			int amountX = int(Pools[PID].amount1);
			int amountY = int(Pools[PID].amount0);

			rate = uint(amountX.div(amountY));
		}
		return rate;
	}


	// @dev given a pool id and a token address, return the other token address
	function getOtherTokenAddr(uint PID, address token0) public view returns (address token1) {
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
	function numberOfPools() public view returns (uint) {
		return PIDs.length;
	}
	
}