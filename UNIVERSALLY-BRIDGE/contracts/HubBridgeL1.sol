// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@layerzerolabs/lz-evm-oapp-v2/contracts/oapp/OApp.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

interface IInbox {
    function createRetryableTicket(address to, uint256 l2CallValue, uint256 maxSubmissionCost, address excessFeeRefundAddress, address callValueRefundAddress, uint256 gasLimit, uint256 maxFeePerGas, bytes calldata data) external payable returns (uint256);
}

contract HubBridgeL1 is OApp {
    struct L2Config { address inbox; address destinationContract; bool isActive; }
    L2Config public robinhoodConfig;

    event RelayedToL2(address indexed user, uint256 tokenId, uint256 ticketId);

    // 🔧 CORRECTION : Ajout de _owner au constructeur
    constructor(address _endpoint, address _owner) OApp(_endpoint, _owner) Ownable(_owner) {}

    function setRobinhoodConfig(address _inbox, address _destinationContract) external onlyOwner {
        robinhoodConfig = L2Config(_inbox, _destinationContract, true);
    }

    function _lzReceive(Origin calldata, bytes32, bytes calldata _payload, address, bytes calldata) internal override {
        (address user, , uint256 tokenId) = abi.decode(_payload, (address, address, uint256));

        require(robinhoodConfig.isActive, "Hub: config inactive");

        bytes memory l2CallData = abi.encodeWithSignature("mint(address,uint256)", user, tokenId);
        uint256 ticketCost = 0.005 ether + (2000000 * 0.5 gwei);

        uint256 ticketId = IInbox(robinhoodConfig.inbox).createRetryableTicket{value: ticketCost}(
            robinhoodConfig.destinationContract, 0, 0.005 ether, user, user, 2000000, 0.5 gwei, l2CallData
        );

        emit RelayedToL2(user, tokenId, ticketId);
    }

    receive() external payable {}

    function withdrawTreasury() external onlyOwner {
        uint256 balance = address(this).balance;
        require(balance > 0, "Tresorerie vide");
        payable(owner()).transfer(balance);
    }
}