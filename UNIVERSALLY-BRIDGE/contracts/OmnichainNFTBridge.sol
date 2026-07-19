// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@layerzerolabs/lz-evm-oapp-v2/contracts/oapp/OApp.sol";
import { OptionsBuilder } from "@layerzerolabs/lz-evm-oapp-v2/contracts/oapp/libs/OptionsBuilder.sol";

contract OmnichainNFTBridge is OApp {
    using OptionsBuilder for bytes;

    uint256 public serviceFee = 0.001 ether;
    uint32 public constant ROBINHOOD_EID = 30416; // EID Mainnet Officiel de Robinhood

    event BridgeInitiated(address indexed user, address nftContract, uint256 tokenId, uint256 lzFee);

    constructor(address _endpoint, address _owner) OApp(_endpoint, _owner) Ownable(_owner) {}

    function _buildOptions() internal pure returns (bytes memory) {
        return OptionsBuilder.newOptions().addExecutorLzReceiveOption(200000, 0);
    }

    function quoteBridge(uint256 _tokenId) public view returns (uint256 nativeFee) {
        bytes memory payload = abi.encode(msg.sender, _tokenId);
        MessagingFee memory fee = _quote(ROBINHOOD_EID, payload, _buildOptions(), false);
        return fee.nativeFee;
    }

    function bridgeNFT(address nftContract, uint256 tokenId) external payable {
        bytes memory payload = abi.encode(msg.sender, tokenId);
        bytes memory options = _buildOptions();

        MessagingFee memory fee = _quote(ROBINHOOD_EID, payload, options, false);
        require(msg.value >= serviceFee + fee.nativeFee, "Fonds insuffisants");

        IERC721(nftContract).transferFrom(msg.sender, address(this), tokenId);

        _lzSend(ROBINHOOD_EID, payload, options, MessagingFee(fee.nativeFee, 0), payable(msg.sender));

        emit BridgeInitiated(msg.sender, nftContract, tokenId, fee.nativeFee);
    }

    // Fonction requise par OApp, mais non utilisée ici car ce contrat ne fait qu'envoyer
    function _lzReceive(Origin calldata, bytes32, bytes calldata, address, bytes calldata) internal override {}
}