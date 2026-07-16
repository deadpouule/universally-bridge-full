import hre from "hardhat";
const ethers = (hre as any).ethers;
const network = (hre as any).network;

async function main() {
  if (network.name !== "sepolia") {
    throw new Error("Ce script doit être lancé sur le réseau Sepolia !");
  }

  const [deployer] = await ethers.getSigners();
  console.log(`Compte : ${deployer.address}`);

  const TestNFT = await ethers.getContractFactory("TestNFT");
  const nft = await TestNFT.deploy();
  await nft.waitForDeployment();
  
  const nftAddress = await nft.getAddress();
  console.log(`✅ TestNFT déployé sur Sepolia à l'adresse : ${nftAddress}`);

  console.log("Création (mint) du Token #1 en cours...");
  
  const tx = await (nft as any).mint(deployer.address);
  await tx.wait();
  
  console.log(`✅ Token #1 transféré à ${deployer.address}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});