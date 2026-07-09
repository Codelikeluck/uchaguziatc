// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

contract VoterRegistry {
    struct Voter {
        bytes32 studentHash;
        bool hasVoted;
        uint256 registeredAt;
    }

    mapping(address => Voter) public voters;
    mapping(bytes32 => bool) public registeredStudentHashes;
    address public admin;
    uint256 public voterCount;

    event VoterRegistered(address indexed voter, bytes32 studentHash);
    event VoteRecorded(address indexed voter, uint256 timestamp);

    modifier onlyAdmin() {
        require(msg.sender == admin, "Only admin");
        _;
    }

    constructor() {
        admin = msg.sender;
    }

    function registerVoter(address _voter, bytes32 _studentHash) external onlyAdmin {
        require(!registeredStudentHashes[_studentHash], "Student already registered");
        require(voters[_voter].registeredAt == 0, "Address already registered");

        voters[_voter] = Voter({
            studentHash: _studentHash,
            hasVoted: false,
            registeredAt: block.timestamp
        });
        registeredStudentHashes[_studentHash] = true;
        voterCount++;

        emit VoterRegistered(_voter, _studentHash);
    }

    function registerMultipleVoters(address[] calldata _voters, bytes32[] calldata _hashes) external onlyAdmin {
        require(_voters.length == _hashes.length, "Length mismatch");
        for(uint i = 0; i < _voters.length; i++) {
            if(!registeredStudentHashes[_hashes[i]] && voters[_voters[i]].registeredAt == 0) {
                voters[_voters[i]] = Voter(_hashes[i], false, block.timestamp);
                registeredStudentHashes[_hashes[i]] = true;
                voterCount++;
            }
        }
    }

    function markAsVoted(address _voter) external {
        require(voters[_voter].registeredAt != 0, "Not registered");
        require(!voters[_voter].hasVoted, "Already voted");
        voters[_voter].hasVoted = true;
        emit VoteRecorded(_voter, block.timestamp);
    }

    function isEligible(address _voter) external view returns (bool) {
        return voters[_voter].registeredAt != 0 && !voters[_voter].hasVoted;
    }

    function hasVoted(address _voter) external view returns (bool) {
        return voters[_voter].hasVoted;
    }
}