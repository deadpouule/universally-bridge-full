// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract WrappedNFT is ERC721, Ownable {
    // On passe msg.sender au constructeur d'Ownable pour OpenZeppelin v5
    constructor() ERC721("Universally Wrapped", "uWRAP") Ownable(msg.sender) {}

    // Seul le propriétaire (qui sera notre HubBridgeL2) pourra appeler cette fonction
    function mint(address to, uint256 tokenId) external onlyOwner {
        _safeMint(to, tokenId);
    }
}