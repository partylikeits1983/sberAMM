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

    mapping(uint => bool) public pausedPIDs;

    uint public AmplificationFactor; 

    modifier onlyAdmin() {
        require(msg.sender == admin, "not deployer");
        _;
    }

    modifier PIDstatus(uint PID) {
        require(pausedPIDs[PID] == false, "trading paused on pool");
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

    function startStopPool(uint PID, bool paused) external onlyAdmin {
        pausedPIDs[PID] = paused;
    }

    function modifyAmplificationFactor(uint _ampFactor) external onlyAdmin {
       AmplificationFactor = _ampFactor;
    }
}
