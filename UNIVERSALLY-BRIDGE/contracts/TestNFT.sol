// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";

contract TestNFT is ERC721 {
    uint256 public nextTokenId = 1;

    constructor() ERC721("Sepolia Test NFT", "STNFT") {}

    // La sécurité "onlyOwner" a été retirée. N'importe qui peut minter !
    function mint(address to) external {
        _safeMint(to, nextTokenId);
        nextTokenId++;
    }
}