// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

contract Token is ERC20 {
    uint constant _initial_supply = 1e18 * 1e6;

    string _name = "Token";
    string _symbol = "TK";

    constructor() ERC20(_name, _symbol) {
        _mint(msg.sender, _initial_supply);
    }
}