// SPDX-License-Identifier: MIT
pragma solidity 0.8.7;

import "../NFT/DeNftBridge.sol";

contract MockDeNftBridge is DeNftBridge {
    uint256 public chainId;


    function initializeMock(
        IDeBridgeGate _deBridgeGate,
        uint256 overrideChainId
    )  public initializer {
        super.initialize(_deBridgeGate);
        chainId = overrideChainId;
    }

    // return overrided chain id
    function getChainId() public view override returns (uint256 cid) {
        return chainId;
    }
}