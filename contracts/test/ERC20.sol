// SPDX-License-Identifier: GPL-3.0-or-later

pragma solidity =0.8.18;

import "../UniswapV2ERC20.sol";

contract ERC20 is UniswapV2ERC20 {

    uint256 TOTAL_SUPPLY = 1e6 * 1e18;

    constructor() {
        _mint(msg.sender, TOTAL_SUPPLY);
    }
}
