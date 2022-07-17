import hre, { ethers } from "hardhat";
import 'dotenv/config';

const NUMBER_OF_CONFIRMATIONS = 5;

async function main() {
  // Deploy the contract
  console.info("Deploy the contract...")
  const Factory = await ethers.getContractFactory("ChatRoom");
  const contract = await Factory.deploy();
  console.info("Contract deployed! Address:", contract.address);

  if (process.env.VERIFY === undefined) return;

  // wait for 6 confirmations
  console.info(`Wait for ${NUMBER_OF_CONFIRMATIONS} confirmations...`);
  await contract.deployTransaction.wait(NUMBER_OF_CONFIRMATIONS);

  // Verify the contract
  console.info("Verify the contract...");
  await hre.run("verify:verify", { address: contract.address });
  console.info("Contract verified on Etherscan!");
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
