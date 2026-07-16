// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

contract MockEndpointV2 {
    function quote(
        uint32, /*_dstEid*/
        address, /*_sender*/
        bytes calldata, /*_message*/
        bytes calldata, /*_options*/
        bool /*_payInLzToken*/
    ) external pure returns (uint256 nativeFee, uint256 lzTokenFee) {
        return (0.005 ether, 0);
    }

    function send(
        uint32, /*_dstEid*/
        bytes calldata, /*_message*/
        bytes calldata, /*_options*/
        address /*_refundAddress*/
    ) external payable returns (bytes32 guid, uint64 nonce, uint256 nativeFee, uint256 lzTokenFee) {
        return (bytes32(uint256(1)), 1, 0.005 ether, 0);
    }

    // Fonction requise par OAppCore lors de la construction du HubBridge
    function setDelegate(address /*_delegate*/) external {}

    // Permet au contrat de recevoir des ETH si nécessaire dans les tests
    receive() external payable {}
}