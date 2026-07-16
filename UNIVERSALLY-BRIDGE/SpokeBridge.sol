// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import { OApp, MessagingFee, Origin } from "@layerzerolabs/lz-evm-oapp-v2/contracts/oapp/OApp.sol";
import { MessagingReceipt } from "@layerzerolabs/lz-evm-oapp-v2/contracts/oapp/OAppSender.sol";
import { IERC721 } from "@openzeppelin/contracts/token/ERC721/IERC721.sol";

contract SpokeBridge is OApp {
    uint256 public bridgeFee;

    event NFTLocked(address indexed user, address indexed collection, uint256 tokenId);

    constructor(address _endpoint, address _delegate, uint256 _initialFee) OApp(_endpoint, _delegate) Ownable(_delegate) {
        bridgeFee = _initialFee;
    }

    function setBridgeFee(uint256 _fee) external onlyOwner {
        bridgeFee = _fee;
    }

    function bridgeNFT(
        uint32 _dstEid,
        address _collection,
        uint256 _tokenId,
        bytes calldata _options
    ) external payable returns (MessagingReceipt memory receipt) {
        require(msg.value >= bridgeFee, "Frais de pont insuffisants");

        IERC721(_collection).transferFrom(msg.sender, address(this), _tokenId);

        bytes memory payload = abi.encode(msg.sender, _collection, _tokenId);

        receipt = _lzSend(
            _dstEid,
            payload,
            _options,
            MessagingFee(msg.value - bridgeFee, 0), 
            payable(msg.sender) 
        );

        emit NFTLocked(msg.sender, _collection, _tokenId);
    }

    function _lzReceive(
        Origin calldata _origin,
        bytes32 _guid,
        bytes calldata _payload,
        address _executor,
        bytes calldata _extraData
    ) internal override {
        // Vide
    }
}