// SPDX-Identifier; MIT

pragma solidity ^0.8.19;

contract Admin {

   // Sberbank admin functions:
    address deployer;

    // require isPaused == false
    bool isPaused;

    // can be turned on
    uint AMMFee;

    // dividend paying erc20 token
    address public dividendPayingERC20;

    constructor (uint _fee, address _dividendPayingERC20) {
        deployer = msg.sender;
        AMMFee = _fee;
        isPaused = false;

        dividendPayingERC20 = _dividendPayingERC20;
    }

    modifier onlyDeployer {
        require(msg.sender == deployer, "not deployer");
        _;
    }



}