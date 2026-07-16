import hre from "hardhat";
import fs from "fs";
import path from "path";

const ethers = (hre as any).ethers;

async function main() {
  console.log("🚀 Lancement du déploiement automatisé sur Base Sepolia...\n");

  // 1. DÉPLOIEMENT DU NFT
  console.log("⏳ 1/3 Déploiement du TestNFT...");
  const TestNFT = await ethers.getContractFactory("TestNFT");
  const nft = await TestNFT.deploy();
  await nft.waitForDeployment();
  const nftAddress = await nft.getAddress();
  console.log(`✅ TestNFT déployé : ${nftAddress}`);

  // 2. DÉPLOIEMENT DU MOCK INBOX (Pour simuler Arbitrum sur Base)
  console.log("\n⏳ 2/3 Déploiement du MockInbox...");
  const MockInbox = await ethers.getContractFactory("MockInbox");
  const mockInbox = await MockInbox.deploy();
  await mockInbox.waitForDeployment();
  const inboxAddress = await mockInbox.getAddress();
  console.log(`✅ MockInbox déployé : ${inboxAddress}`);

  // 3. DÉPLOIEMENT DU BRIDGE ET LIAISON
  console.log("\n⏳ 3/3 Déploiement du SpokeBridgeL1...");
  const SpokeBridgeL1 = await ethers.getContractFactory("SpokeBridgeL1");
  const bridge = await SpokeBridgeL1.deploy(inboxAddress); 
  await bridge.waitForDeployment();
  const bridgeAddress = await bridge.getAddress();
  console.log(`✅ SpokeBridgeL1 déployé : ${bridgeAddress}`);

  console.log("🔗 Liaison du SpokeBridge avec le Hub L2...");
  const l2HubAddress = "0x8F1099dBC4BeDd1d3Dc586754c136986F6295083"; 
  const tx = await bridge.setL2HubBridge(l2HubAddress);
  await tx.wait();
  console.log("✅ Pont câblé avec succès !");

  // 4. MISE À JOUR AUTOMATIQUE DU FRONTEND
  console.log("\n🤖 Mise à jour automatique de l'interface utilisateur...");
  
  // Chemin relatif vers ton projet frontend (en remontant d'un dossier depuis UNIVERSALLY-BRIDGE)
  const frontendPath = path.resolve(__dirname, "../../universally-bridge-ui/src/app/page.tsx");

  if (fs.existsSync(frontendPath)) {
    let content = fs.readFileSync(frontendPath, "utf8");

    // Expressions régulières pour trouver dynamiquement le bloc "Base Sepolia" et remplacer les adresses
    content = content.replace(
      /(name:\s*'Base Sepolia'[\s\S]*?nftContract:\s*")[^"]*(")/,
      `$1${nftAddress}$2`
    );
    
    content = content.replace(
      /(name:\s*'Base Sepolia'[\s\S]*?bridgeContract:\s*")[^"]*(")/,
      `$1${bridgeAddress}$2`
    );

    // Sauvegarde du fichier modifié
    fs.writeFileSync(frontendPath, content);
    console.log(`✨ BINGO ! Fichier page.tsx mis à jour automatiquement.`);
  } else {
    console.error(`⚠️ Impossible de trouver le fichier frontend au chemin : ${frontendPath}`);
    console.log("👉 Tu devras copier ces adresses manuellement :");
    console.log(`NFT: ${nftAddress}`);
    console.log(`Bridge: ${bridgeAddress}`);
  }

  console.log("\n🏁 DÉPLOIEMENT TERMINÉ. Tu peux tester sur ton navigateur !");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});