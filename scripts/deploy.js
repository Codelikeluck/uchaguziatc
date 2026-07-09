const hre = require("hardhat");

async function main() {
  console.log("Deploying ATC Voting System Contracts...");

  const VoterRegistry = await hre.ethers.getContractFactory("VoterRegistry");
  const voterRegistry = await VoterRegistry.deploy();
  await voterRegistry.waitForDeployment();
  console.log("VoterRegistry deployed to:", await voterRegistry.getAddress());

  const AuditTrail = await hre.ethers.getContractFactory("AuditTrail");
  const auditTrail = await AuditTrail.deploy();
  await auditTrail.waitForDeployment();
  console.log("AuditTrail deployed to:", await auditTrail.getAddress());

  const Ballot = await hre.ethers.getContractFactory("Ballot");
  const ballot = await Ballot.deploy(await voterRegistry.getAddress());
  await ballot.waitForDeployment();
  console.log("Ballot deployed to:", await ballot.getAddress());

  const TallyContract = await hre.ethers.getContractFactory("TallyContract");
  const tally = await TallyContract.deploy();
  await tally.waitForDeployment();
  console.log("TallyContract deployed to:", await tally.getAddress());

  await tally.setBallotContract(await ballot.getAddress());
  console.log("Linked TallyContract to Ballot");

  console.log("\nDeployment complete! Update your .env with:");
  console.log(`VOTER_REGISTRY_ADDRESS=${await voterRegistry.getAddress()}`);
  console.log(`BALLOT_ADDRESS=${await ballot.getAddress()}`);
  console.log(`TALLY_ADDRESS=${await tally.getAddress()}`);
  console.log(`AUDIT_TRAIL_ADDRESS=${await auditTrail.getAddress()}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
