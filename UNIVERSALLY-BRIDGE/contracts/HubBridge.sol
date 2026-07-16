// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

interface IMintableERC721 {
    function mint(address to, uint256 tokenId) external;
}

contract HubBridge is Ownable {
    mapping(address => address) public wrappedNFTs;
    address public l1SpokeBridge;

    event NFTReceived(address indexed user, address indexed originalNft, address wrappedNft, uint256 tokenId);

    constructor(address _l1SpokeBridge, address _initialOwner) Ownable(_initialOwner) {
        l1SpokeBridge = _l1SpokeBridge;
    }

    function setWrappedNFT(address _originalNft, address _wrappedNft) external onlyOwner {
        wrappedNFTs[_originalNft] = _wrappedNft;
    }

    // Aligné sur l'encodage de SpokeBridgeL1
    function processMessage(address _owner, address _originalNft, uint256 _tokenId) external {
        address wrappedNft = wrappedNFTs[_originalNft];
        require(wrappedNft != address(0), "Collection non supportee");

        IMintableERC721(wrappedNft).mint(_owner, _tokenId);

        emit NFTReceived(_owner, _originalNft, wrappedNft, _tokenId);
    }
}