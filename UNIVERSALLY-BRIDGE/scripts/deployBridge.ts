import hre from "hardhat";
const ethers = (hre as any).ethers;

async function main() {
  console.log("⏳ Déploiement du SpokeBridgeL1 sur Base Sepolia...");
  
  const [deployer] = await ethers.getSigners();
  
  const SpokeBridgeL1 = await ethers.getContractFactory("SpokeBridgeL1");
  // On utilise ton adresse pour simuler l'inbox afin que le contrat puisse être déployé
  const bridge = await SpokeBridgeL1.deploy(deployer.address); 
  await bridge.waitForDeployment();
  
  console.log(`✅ Bridge déployé avec succès à l'adresse : ${await bridge.getAddress()}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});