import hre from "hardhat";
const ethers = (hre as any).ethers;
const network = (hre as any).network;

async function main() {
  console.log(`🚀 Début du déploiement sur le réseau : ${network.name}`);

  if (network.name === "mainnet") {
    console.warn("⚠️ ATTENTION : Vous déployez sur le Mainnet !");
  }

  console.log("⏳ Déploiement du TestNFT en cours...");
  
  const TestNFT = await ethers.getContractFactory("TestNFT"); 
  const testNFT = await TestNFT.deploy();
  
  await testNFT.waitForDeployment();
  const testNFTAddress = await testNFT.getAddress();
  
  console.log(`✅ TestNFT déployé avec succès à l'adresse : ${testNFTAddress}`);

  console.log("\n🎉 Opération terminée !");
  console.log("👉 Copie l'adresse générée et colle-la dans la constante SUPPORTED_CHAINS de ton fichier src/app/page.tsx");
}

main().catch((error) => {
  console.error("🚨 Erreur lors du déploiement :", error);
  process.exitCode = 1;
});