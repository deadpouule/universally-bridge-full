// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract WrappedNFT is ERC721, Ownable {
    address public bridgeHub;

    constructor(string memory name, string memory symbol, address _bridgeHub) ERC721(name, symbol) Ownable(msg.sender) {
        bridgeHub = _bridgeHub;
    }

    modifier onlyBridge() {
        require(msg.sender == bridgeHub, "Seul le bridge peut minter");
        _;
    }

    function mint(address to, uint256 tokenId) external onlyBridge {
        _mint(to, tokenId);
    }
}