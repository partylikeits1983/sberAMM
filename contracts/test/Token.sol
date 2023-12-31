// SPDX-License-Identifier: BSD-3-Clause
// Authors: Alexander John Lee & Mikhail Bolshakov

pragma solidity ^0.8.19;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

contract Token is ERC20 {
    uint constant _initial_supply = 100 * 1e18 * 1e6; // 100 million

    string _name = "Token";
    string _symbol = "TEST";

    constructor() ERC20(_name, _symbol) {
        _mint(msg.sender, _initial_supply);
    }
}
