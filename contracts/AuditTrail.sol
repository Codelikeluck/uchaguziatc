// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

contract AuditTrail {
    struct AuditEvent {
        string eventType;
        bytes32 dataHash;
        address actor;
        uint256 timestamp;
        uint256 blockNumber;
    }

    AuditEvent[] public events;
    mapping(uint256 => bytes32) public blockEventRoot;

    event AuditLog(string eventType, bytes32 dataHash, address actor, uint256 timestamp);

    function logEvent(string calldata _eventType, bytes32 _dataHash) external {
        AuditEvent memory evt = AuditEvent({
            eventType: _eventType,
            dataHash: _dataHash,
            actor: msg.sender,
            timestamp: block.timestamp,
            blockNumber: block.number
        });
        events.push(evt);
        emit AuditLog(_eventType, _dataHash, msg.sender, block.timestamp);
    }

    function getEvent(uint256 _index) external view returns (AuditEvent memory) {
        require(_index < events.length, "Index out of bounds");
        return events[_index];
    }

    function getEventCount() external view returns (uint256) {
        return events.length;
    }

    function getEventsByType(string calldata _eventType) external view returns (AuditEvent[] memory) {
        uint256 count = 0;
        for(uint i = 0; i < events.length; i++) {
            if(keccak256(bytes(events[i].eventType)) == keccak256(bytes(_eventType))) {
                count++;
            }
        }
        AuditEvent[] memory result = new AuditEvent[](count);
        uint256 idx = 0;
        for(uint i = 0; i < events.length; i++) {
            if(keccak256(bytes(events[i].eventType)) == keccak256(bytes(_eventType))) {
                result[idx] = events[i];
                idx++;
            }
        }
        return result;
    }
}