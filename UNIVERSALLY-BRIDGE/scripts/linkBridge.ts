import hre from "hardhat";
const ethers = (hre as any).ethers;

async function main() {
  const spokeBridgeAddress = "0x76285C02ceFa864D15Fe3F53a364eE4590323229"; 
  
  // ⚠️ Remplace cette chaîne par l'adresse réelle de ton Hub L2 (ex: "0x8F10...")
  const l2HubAddress = "0x8F1099dBC4BeDd1d3Dc586754c136986F6295083"; 

  const [deployer] = await ethers.getSigners();
  const SpokeBridgeL1 = await ethers.getContractFactory("SpokeBridgeL1");
  const spokeBridge = SpokeBridgeL1.attach(spokeBridgeAddress);

  console.log("Liaison du SpokeBridge avec le Hub L2...");
  const tx = await spokeBridge.setL2HubBridge(l2HubAddress);
  await tx.wait();

  console.log("✅ Pont câblé avec succès !");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});