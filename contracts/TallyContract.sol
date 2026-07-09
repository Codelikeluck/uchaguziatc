// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

contract TallyContract {
    struct Tally {
        uint256 candidateId;
        uint256 voteCount;
        uint256 lastUpdated;
    }

    mapping(uint256 => mapping(uint256 => uint256)) public tallies;
    mapping(uint256 => uint256[]) public positionCandidates;
    mapping(uint256 => bool) public tallyFinalized;

    address public ballotContract;
    address public admin;

    event TallyUpdated(uint256 indexed electionId, uint256 candidateId, uint256 count);
    event TallyFinalized(uint256 indexed electionId);

    modifier onlyBallot() {
        require(msg.sender == ballotContract, "Only ballot contract");
        _;
    }

    modifier onlyAdmin() {
        require(msg.sender == admin, "Only admin");
        _;
    }

    constructor() {
        admin = msg.sender;
    }

    function setBallotContract(address _ballot) external onlyAdmin {
        ballotContract = _ballot;
    }

    function incrementTally(uint256 _electionId, uint256 _candidateId) external onlyBallot {
        require(!tallyFinalized[_electionId], "Tally finalized");
        if(tallies[_electionId][_candidateId] == 0) {
            positionCandidates[_electionId].push(_candidateId);
        }
        tallies[_electionId][_candidateId]++;
        emit TallyUpdated(_electionId, _candidateId, tallies[_electionId][_candidateId]);
    }

    function getTally(uint256 _electionId, uint256 _candidateId) external view returns (uint256) {
        return tallies[_electionId][_candidateId];
    }

    function getResults(uint256 _electionId) external view returns (uint256[] memory candidates, uint256[] memory counts) {
        uint256[] memory cands = positionCandidates[_electionId];
        uint256[] memory tallies_ = new uint256[](cands.length);
        for(uint i = 0; i < cands.length; i++) {
            tallies_[i] = tallies[_electionId][cands[i]];
        }
        return (cands, tallies_);
    }

    function finalizeTally(uint256 _electionId) external onlyAdmin {
        tallyFinalized[_electionId] = true;
        emit TallyFinalized(_electionId);
    }
}