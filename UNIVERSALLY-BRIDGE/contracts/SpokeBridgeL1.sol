// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20; // Version recommandée par LZ V2

import "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@layerzerolabs/lz-evm-oapp-v2/contracts/oapp/OApp.sol";
import { OptionsBuilder } from "@layerzerolabs/lz-evm-oapp-v2/contracts/oapp/libs/OptionsBuilder.sol";

contract SpokeBridgeL1 is OApp {
    using OptionsBuilder for bytes;

    uint256 public serviceFee = 0.001 ether; 
    uint32 public destinationEid; 

    event BridgeInitiated(address indexed user, address nftContract, uint256 tokenId, uint256 totalFeePaid, uint256 lzFee);

    // 🔧 CORRECTION : Le constructeur prend désormais _owner pour satisfaire OApp V2
    constructor(address _endpoint, address _owner) OApp(_endpoint, _owner) Ownable(_owner) {}

    function setDestinationEid(uint32 _eid) external onlyOwner {
        destinationEid = _eid;
    }

    function _buildOptions() internal pure returns (bytes memory) {
        return OptionsBuilder.newOptions().addExecutorLzReceiveOption(500000, 0);
    }

    function _payNative(uint256 _nativeFee) internal override returns (uint256 nativeFee) {
        return _nativeFee;
    }

    function bridgeNFT(address nftContract, uint256 tokenId) external payable {
        bytes memory payload = abi.encode(msg.sender, nftContract, tokenId);
        bytes memory options = _buildOptions(); 
        
        MessagingFee memory fee = _quote(destinationEid, payload, options, false);
        uint256 totalCostRequired = serviceFee + fee.nativeFee;
        require(msg.value >= totalCostRequired, "Fonds insuffisants");

        IERC721(nftContract).transferFrom(msg.sender, address(this), tokenId);

        _lzSend(
            destinationEid,
            payload,
            options,
            MessagingFee(fee.nativeFee, 0),
            payable(msg.sender)
        );

        emit BridgeInitiated(msg.sender, nftContract, tokenId, msg.value, fee.nativeFee);
    }

    function _lzReceive(Origin calldata, bytes32, bytes calldata, address, bytes calldata) internal override {}
}