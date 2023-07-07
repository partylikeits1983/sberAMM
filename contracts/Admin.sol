// SPDX-Identifier; MIT

pragma solidity ^0.8.19;

contract Admin {
    // Sberbank admin functions:
    address admin;

    // require isPaused == false
    bool isPaused;

    // can be turned on
    uint AMMFee;

    // dividend paying erc20 token
    address public dividendPayingERC20;

    constructor(uint _fee, address _dividendPayingERC20) {
        admin = msg.sender;
        AMMFee = _fee;
        isPaused = false;

        dividendPayingERC20 = _dividendPayingERC20;
    }

    modifier onlyAdmin() {
        require(msg.sender == admin, "not deployer");
        _;
    }

    function setIsPaused(bool _isPaused) external onlyAdmin {
        isPaused = _isPaused;
    }
}
