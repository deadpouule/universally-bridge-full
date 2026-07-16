// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

contract MockInbox {
    uint256 public nextTicketId = 1;

    // Cette fonction reçoit l'appel du bridge et simule un succès
    function createRetryableTicket(
        address /*to*/,
        uint256 /*l2CallValue*/,
        uint256 /*maxSubmissionCost*/,
        address /*excessFeeRefundAddress*/,
        address /*callValueRefundAddress*/,
        uint256 /*gasLimit*/,
        uint256 /*maxFeePerGas*/,
        bytes calldata /*data*/
    ) external payable returns (uint256) {
        uint256 ticketId = nextTicketId;
        nextTicketId++;
        return ticketId;
    }
}