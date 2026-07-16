// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

// Interface minimale pour communiquer avec le pont Arbitrum natif
interface IInbox {
    function createRetryableTicket(
        address to,
        uint256 l2CallValue,
        uint256 maxSubmissionCost,
        address excessFeeRefundAddress,
        address callValueRefundAddress,
        uint256 gasLimit,
        uint256 maxFeePerGas,
        bytes calldata data
    ) external payable returns (uint256);
}

contract SpokeBridgeL1 is Ownable {
    IInbox public inbox;
    address public l2HubBridge; // L'adresse du contrat sur Robinhood Chain
    
    event NFTBridged(address indexed user, address indexed collection, uint256 tokenId, uint256 ticketId);

    constructor(address _inboxAddress) Ownable(msg.sender) {
        inbox = IInbox(_inboxAddress);
    }

    function setL2HubBridge(address _l2HubBridge) external onlyOwner {
        l2HubBridge = _l2HubBridge;
    }

    // Fonction principale appelée par l'utilisateur
    function bridgeNFT(
        address collection, 
        uint256 tokenId, 
        uint256 maxSubmissionCost, 
        uint256 gasLimit, 
        uint256 maxFeePerGas
    ) external payable {
        require(l2HubBridge != address(0), "L2 Hub non defini");

        // 1. Verrouiller le NFT dans ce contrat
        IERC721(collection).transferFrom(msg.sender, address(this), tokenId);

        // 2. Préparer le message pour le HubBridge L2 (appel de sa fonction processMessage)
        bytes memory data = abi.encodeWithSignature(
            "processMessage(address,address,uint256)", 
            msg.sender, 
            collection, 
            tokenId
        );

        // 3. Envoyer le ticket L1 -> L2 via l'Inbox Arbitrum
        uint256 ticketId = inbox.createRetryableTicket{value: msg.value}(
            l2HubBridge,           // Destination sur L2
            0,                     // Pas d'ETH transféré directement au contrat
            maxSubmissionCost,     // Coût de soumission du ticket payé en ETH
            msg.sender,            // Remboursement des frais en trop sur L2
            msg.sender,            // Remboursement du gaz non utilisé sur L2
            gasLimit,
            maxFeePerGas,
            data
        );

        emit NFTBridged(msg.sender, collection, tokenId, ticketId);
    }
}