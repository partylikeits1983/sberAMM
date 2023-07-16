// SPDX-License-Identifier: BSD-3-Clause
// Authors: Alexander John Lee & Mikhail Bolshakov

// a library for performing various math operations
pragma solidity ^0.8.19;

library SD {
    function mul(int a, int b) public pure returns (int) {
        int c = (a * b) / 1e18;
        return c;
    }

    function div(int a, int b) public pure returns (int) {
        int c = (a * 1e18) / b;
        return c;
    }
}
