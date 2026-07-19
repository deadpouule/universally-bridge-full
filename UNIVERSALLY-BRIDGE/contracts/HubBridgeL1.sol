// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@layerzerolabs/lz-evm-oapp-v2/contracts/oapp/OApp.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

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

contract HubBridgeL1 is OApp {
    
    // 🗂️ Structure de configuration pour chaque L2
    struct L2Config {
        address inbox;
        address destinationContract;
        bool isActive;
    }

    // 🗺️ Cartographie : EID final => Configuration L2
    mapping(uint32 => L2Config) public l2Configs;

    event RelayedToL2(address indexed user, uint256 tokenId, uint32 targetEid, uint256 ticketId);

    constructor(address _endpoint) OApp(_endpoint, msg.sender) Ownable(msg.sender) {}

    // ⚙️ Ajout d'un nouveau circuit (L2) au Hub
    function setL2Config(uint32 _targetEid, address _inbox, address _destinationContract) external onlyOwner {
        l2Configs[_targetEid] = L2Config({
            inbox: _inbox,
            destinationContract: _destinationContract,
            isActive: true
        });
    }

    // 📥 Réception du signal LayerZero en provenance d'un Spoke (ex: Base)
    function _lzReceive(
        Origin calldata /*_origin*/,
        bytes32 /*_guid*/,
        bytes calldata _payload,
        address /*_executor*/,
        bytes calldata /*_extraData*/
    ) internal override {
        
        // 1. Décodage étendu : On récupère la destination finale
        (address user, , uint256 tokenId, uint32 finalDestinationEid) = abi.decode(_payload, (address, address, uint256, uint32));

        // 2. Vérification de la cartographie
        L2Config memory config = l2Configs[finalDestinationEid];
        require(config.isActive, "Hub: Destination L2 non supportee");
        require(config.inbox != address(0), "Hub: Inbox non configure");

        // 3. Préparation de la commande pour le contrat cible
        bytes memory l2CallData = abi.encodeWithSignature("mint(address,uint256)", user, tokenId);

        // 4. Paramètres de gaz L1 -> L2
        uint256 maxSubmissionCost = 0.005 ether;
        uint256 gasLimit = 2000000;
        uint256 maxFeePerGas = 0.5 gwei;
        
        uint256 ticketCost = maxSubmissionCost + (gasLimit * maxFeePerGas);
        require(address(this).balance >= ticketCost, "Hub: Tresorerie vide");

        // 5. Achat dynamique du Ticket dans le bon Inbox
        uint256 ticketId = IInbox(config.inbox).createRetryableTicket{value: ticketCost}(
            config.destinationContract,
            0,
            maxSubmissionCost,
            user,
            user,
            gasLimit,
            maxFeePerGas,
            l2CallData
        );

        emit RelayedToL2(user, tokenId, finalDestinationEid, ticketId);
    }

    receive() external payable {}
}