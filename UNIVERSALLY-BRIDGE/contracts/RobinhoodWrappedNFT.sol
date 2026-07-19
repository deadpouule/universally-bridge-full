// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@layerzerolabs/lz-evm-oapp-v2/contracts/oapp/OApp.sol";
import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract RobinhoodWrappedNFT is ERC721, OApp {
    
    constructor(address _endpoint, address _owner) 
        ERC721("Robinhood Wrapped NFT", "RWNFT") 
        OApp(_endpoint, _owner) 
        Ownable(_owner) 
    {}

    function _lzReceive(
        Origin calldata /*_origin*/,
        bytes32 /*_guid*/,
        bytes calldata _payload,
        address /*_executor*/,
        bytes calldata /*_extraData*/
    ) internal override {
        // Décodage du signal direct en provenance de Base, Berachain, Monad ou MegaETH
        (address user, uint256 tokenId) = abi.decode(_payload, (address, uint256));

        // Mint direct on-chain sur Robinhood !
        _safeMint(user, tokenId);
    }
}