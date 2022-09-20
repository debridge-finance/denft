// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;
import "../interfaces/ICallProxy.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

contract MockProxyConsumer {
    using SafeERC20 for IERC20;

    uint256 public constant CHAIN_ID_FROM = 42;

    address public callProxy;
    address public token;
    bool public lastOperationStatus;

    constructor(address _callProxy, address _token) {
        callProxy = _callProxy;
        token = _token;
    }

    function transferToken(
        address _token,
        address _receiver,
        address _fallbackAddress,
        uint256 _flags,
        bytes memory _data
    ) external payable {
        bool status;
        if (_token == address(0)) {
            status = ICallProxy(callProxy).call{value: msg.value}(
                _fallbackAddress,
                _receiver,
                _data,
                0,
                "",
                CHAIN_ID_FROM
            );
        } else {
            IERC20(_token).transfer(callProxy, msg.value);
            status = ICallProxy(callProxy).callERC20(
                _token,
                _fallbackAddress,
                _receiver,
                _data,
                _flags,
                "",
                CHAIN_ID_FROM
            );
        }
        lastOperationStatus = status;
    }
}
