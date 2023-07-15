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

    modifier onlyAdmin() {
        require(msg.sender == admin, "not deployer");
        _;
    }

    function setIsPaused(bool _isPaused) external onlyAdmin {
        isPaused = _isPaused;
    }

    function modifyFeeAmount(uint _fee) external onlyAdmin {
        AMMFee = _fee;
    }

    function modifySplitterAddress(address _dividendPayingERC20) external onlyAdmin {
        dividendPayingERC20 = _dividendPayingERC20;
    }
}
