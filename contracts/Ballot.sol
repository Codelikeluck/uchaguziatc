// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "./VoterRegistry.sol";

contract Ballot {
    struct Candidate {
        uint256 id;
        bytes32 nameHash;
        bytes32 manifestoHash;
        uint256 positionId;
        bool exists;
    }

    struct VotePayload {
        bytes32 encryptedVote;
        bytes32 ipfsHash;
        uint256 electionId;
        uint256 timestamp;
        bytes32 zkProof;
    }

    mapping(uint256 => Candidate) public candidates;
    mapping(bytes32 => VotePayload) public votes;
    mapping(uint256 => bytes32[]) public electionVotes;

    uint256 public candidateCount;
    uint256 public voteCount;
    VoterRegistry public voterRegistry;
    address public admin;

    event CandidateAdded(uint256 indexed id, uint256 positionId);
    event VoteStored(bytes32 indexed voteHash, uint256 electionId);

    modifier onlyAdmin() {
        require(msg.sender == admin, "Only admin");
        _;
    }

    constructor(address _voterRegistry) {
        admin = msg.sender;
        voterRegistry = VoterRegistry(_voterRegistry);
    }

    function addCandidate(bytes32 _nameHash, bytes32 _manifestoHash, uint256 _positionId) external onlyAdmin returns (uint256) {
        candidateCount++;
        candidates[candidateCount] = Candidate(candidateCount, _nameHash, _manifestoHash, _positionId, true);
        emit CandidateAdded(candidateCount, _positionId);
        return candidateCount;
    }

    function storeVote(
        bytes32 _voteHash,
        bytes32 _encryptedVote,
        bytes32 _ipfsHash,
        uint256 _electionId,
        bytes32 _zkProof
    ) external {
        require(voterRegistry.isEligible(msg.sender), "Not eligible");
        require(votes[_voteHash].timestamp == 0, "Vote exists");

        votes[_voteHash] = VotePayload(_encryptedVote, _ipfsHash, _electionId, block.timestamp, _zkProof);
        electionVotes[_electionId].push(_voteHash);
        voteCount++;

        voterRegistry.markAsVoted(msg.sender);
        emit VoteStored(_voteHash, _electionId);
    }

    function getElectionVotes(uint256 _electionId) external view returns (bytes32[] memory) {
        return electionVotes[_electionId];
    }

    function verifyVoteExists(bytes32 _voteHash) external view returns (bool) {
        return votes[_voteHash].timestamp != 0;
    }
}