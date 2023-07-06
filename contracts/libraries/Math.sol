// a library for performing various math operations

// SPDX-License-Identifier: MIT
pragma solidity ^0.8.17;

library SD {
	function mul(int a, int b) public pure returns (int) {
		int c = a * b / 1e18;
		return c;
	}	

	function div(int a, int b) public pure returns (int) {
		int c = a * 1e18 / b;
		return c;
	}
}