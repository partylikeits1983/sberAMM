// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

contract ChessFishToken is ERC20 {
    // Mint 1 000 000 CFSH tokens
    uint constant _initial_supply = 1e18 * 1e6;

    string _name = "Sberbank Dividend Paying AMM token";
    string _symbol = "SDIV";

    constructor() ERC20(_name, _symbol) {
        _mint(msg.sender, _initial_supply);
    }
}
