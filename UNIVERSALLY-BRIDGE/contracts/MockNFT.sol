// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";

contract MockNFT is ERC721 {
    uint256 public nextId = 1;

    constructor() ERC721("Original NFT", "ONFT") {}

    function mint(address to) external {
        _mint(to, nextId);
        nextId++;
    }
}