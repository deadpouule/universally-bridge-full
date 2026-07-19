// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@layerzerolabs/lz-evm-oapp-v2/contracts/oapp/OApp.sol";
import { OptionsBuilder } from "@layerzerolabs/lz-evm-oapp-v2/contracts/oapp/libs/OptionsBuilder.sol";

contract SpokeBridgeL1 is OApp {
    using OptionsBuilder for bytes;

    // 💰 Frais de service fixes en monnaie native (ex: 0.001 BERA ou ETH). 
    // Remplace complètement l'usine à gaz de l'oracle Chainlink !
    uint256 public serviceFee = 0.001 ether; 

    uint32 public destinationEid; 

    event BridgeInitiated(address indexed user, address nftContract, uint256 tokenId, uint256 totalFeePaid, uint256 lzFee);

    // 🔧 Constructeur allégé : on ne passe plus que l'adresse de LayerZero
    constructor(address _endpoint) OApp(_endpoint, msg.sender) Ownable(msg.sender) {}

    // ⚙️ Définit le réseau de destination
    function setDestinationEid(uint32 _eid) external onlyOwner {
        destinationEid = _eid;
    }

    // 📈 Permet à l'admin d'ajuster sa marge (frais fixes)
    function setServiceFee(uint256 _fee) external onlyOwner {
        serviceFee = _fee;
    }

    // 🔧 Configure la limite de gaz sur le réseau d'arrivée (500 000 de gaz)
    function _buildOptions() internal pure returns (bytes memory) {
        return OptionsBuilder.newOptions().addExecutorLzReceiveOption(500000, 0);
    }

    // 🛡️ Maintient la capacité du contrat à encaisser plus que le coût LayerZero
    function _payNative(uint256 _nativeFee) internal override returns (uint256 nativeFee) {
        return _nativeFee;
    }

    // 📊 Devis ultra-rapide et 100% natif (Frais de service + Gaz LayerZero)
    function quoteBridgeFee(address user, address nftContract, uint256 tokenId) public view returns (uint256) {
        bytes memory payload = abi.encode(user, nftContract, tokenId);
        bytes memory options = _buildOptions(); 
        
        // _quote() est la fonction magique intégrée à OApp LayerZero
        MessagingFee memory fee = _quote(destinationEid, payload, options, false);
        
        return serviceFee + fee.nativeFee;
    }

    // 🚀 La fonction principale pour envoyer le NFT dans le pont
    function bridgeNFT(address nftContract, uint256 tokenId) external payable {
        bytes memory payload = abi.encode(msg.sender, nftContract, tokenId);
        bytes memory options = _buildOptions(); 
        
        // 1. Estimation instantanée via LayerZero
        MessagingFee memory fee = _quote(destinationEid, payload, options, false);
        
        // 2. Vérification des fonds
        uint256 totalCostRequired = serviceFee + fee.nativeFee;
        require(msg.value >= totalCostRequired, "Fonds insuffisants pour couvrir le bridge et le relai");

        // 3. Verrouillage du NFT dans ce contrat
        IERC721(nftContract).transferFrom(msg.sender, address(this), tokenId);

        // 4. Envoi du message inter-chaîne
        _lzSend(
            destinationEid,
            payload,
            options,
            MessagingFee(fee.nativeFee, 0),
            payable(msg.sender) // Le surplus de gaz non utilisé par LayerZero est remboursé à l'utilisateur
        );

        emit BridgeInitiated(msg.sender, nftContract, tokenId, msg.value, fee.nativeFee);
    }

    // 📥 Fonction de réception obligatoire (laissée vide ici car ce contrat ne fait qu'envoyer)
    function _lzReceive(Origin calldata, bytes32, bytes calldata, address, bytes calldata) internal override {}

    // 🏦 Permet au propriétaire de retirer la trésorerie accumulée
    function withdrawTreasury() external onlyOwner {
        uint256 balance = address(this).balance;
        require(balance > 0, "Tresorerie vide");
        payable(owner()).transfer(balance);
    }
}