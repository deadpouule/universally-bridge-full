import hre from "hardhat";
import fs from "fs";
import path from "path";

const ethers = (hre as any).ethers;

// 🧮 Fonction mathématique pour calculer l'Alias d'adresse
function applyAlias(address: string): string {
  const offset = BigInt("0x1111000000000000000000000000000000001111");
  const addrBigInt = BigInt(address);
  const mask = BigInt("0xFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFF");
  const aliased = (addrBigInt + offset) & mask;
  return ethers.toBeHex(aliased, 20);
}

async function main() {
  console.log("🚀 DÉMARRAGE DE LA SÉQUENCE CROSS-CHAIN (BERACHAIN BEPOLIA -> ETH -> ROBINHOOD)...\n");

  const privateKey = process.env.PRIVATE_KEY || process.env.DEPLOY_KEY || process.env.PK;
  if (!privateKey) throw new Error("⚠️ Clé privée introuvable dans le .env !");

  // A. Berachain bEpolia (Source)
  const [beraSigner] = await ethers.getSigners();
  console.log(`👤 Pilote principal connecté : ${beraSigner.address}`);

  // B. Ethereum Sepolia (Hub / Pit Stop)
  const ethRpcUrl = process.env.ETH_SEPOLIA_RPC || "https://ethereum-sepolia-rpc.publicnode.com";
  const ethProvider = new ethers.JsonRpcProvider(ethRpcUrl);
  const ethSigner = new ethers.Wallet(privateKey, ethProvider);

  // C. Robinhood L2 (Destination finale)
  const rhRpcUrl = process.env.ROBINHOOD_RPC || "https://sepolia-rollup.arbitrum.io/rpc"; 
  const rhProvider = new ethers.JsonRpcProvider(rhRpcUrl);
  const rhSigner = new ethers.Wallet(privateKey, rhProvider);

  // --- PHASE 1 : LA SOURCE (BERACHAIN BEPOLIA) ---
  console.log("\n=============================================");
  console.log("🐻 PHASE 1 : DÉPLOIEMENT SUR BERACHAIN BEPOLIA");
  console.log("=============================================");

  console.log("⏳ Déploiement du TestNFT...");
  const TestNFT = await ethers.getContractFactory("TestNFT", beraSigner);
  // On force le gaz même pour le NFT par sécurité sur bEpolia
  const nft = await TestNFT.deploy({ gasLimit: 3000000 });
  await nft.waitForDeployment();
  const nftAddress = await nft.getAddress();
  console.log(`✅ TestNFT déployé : ${nftAddress}`);

  console.log("⏳ Déploiement du SpokeBridgeL1...");
  const SpokeBridgeL1 = await ethers.getContractFactory("SpokeBridgeL1", beraSigner);
  
  // 🔥 L'adresse LayerZero universelle Testnet
  const lzEndpointBera = "0x6EDCE65403992e310A62460808c4b910D972f10f"; 
  const dummyPriceFeed = ethers.ZeroAddress; 

  // 🔥 Le forçage du gaz pour contourner l'erreur "ProviderError" du RPC bEpolia
  const spoke = await SpokeBridgeL1.deploy(lzEndpointBera, dummyPriceFeed, {
    gasLimit: 5000000 
  });
  
  await spoke.waitForDeployment();
  const spokeAddress = await spoke.getAddress();
  console.log(`✅ SpokeBridgeL1 déployé : ${spokeAddress}`);

  // --- PHASE 2 : LE PIT STOP (ETHEREUM SEPOLIA) ---
  console.log("\n=============================================");
  console.log("⛽ PHASE 2 : DÉPLOIEMENT DU HUB SUR ETHEREUM SEPOLIA");
  console.log("=============================================");

  console.log("⏳ Déploiement du HubBridgeL1...");
  const HubBridgeL1 = await ethers.getContractFactory("HubBridgeL1", ethSigner);
  const lzEndpointEth = "0x6EDCE65403992e310A62460808c4b910D972f10f"; 
  
  const hub = await HubBridgeL1.deploy(lzEndpointEth);
  await hub.waitForDeployment();
  const hubAddress = await hub.getAddress();
  console.log(`✅ HubBridgeL1 déployé : ${hubAddress}`);

  console.log("⛽ Ravitaillement du Hub en ETH pour l'Inbox (0.01 ETH)...");
  const fundTx = await ethSigner.sendTransaction({
    to: hubAddress,
    value: ethers.parseEther("0.01")
  });
  await fundTx.wait();
  console.log("✅ Réservoir rempli !");

  // --- PHASE 3 : LA DESTINATION (ROBINHOOD L2) ---
  console.log("\n=============================================");
  console.log("🎯 PHASE 3 : DÉPLOIEMENT SUR ROBINHOOD");
  console.log("=============================================");

  console.log("⏳ Déploiement du WrappedNFT...");
  const WrappedNFT = await ethers.getContractFactory("WrappedNFT", rhSigner);
  const wrappedNft = await WrappedNFT.deploy();
  await wrappedNft.waitForDeployment();
  const wrappedNftAddress = await wrappedNft.getAddress();
  console.log(`✅ WrappedNFT déployé : ${wrappedNftAddress}`);

  // --- PHASE 4 : LE CÂBLAGE INTER-CHAÎNES ---
  console.log("\n=============================================");
  console.log("🔗 PHASE 4 : WIRING & SÉCURITÉ (ALIASING)");
  console.log("=============================================");

  const EID_ETH_SEPOLIA = 40161; 
  const EID_BERACHAIN_BEPOLIA = 40371; 
  const DELAYED_INBOX_ETH = "0xF2939afA86F6f933A3CE17fCAB007907B6b0B7a4";

  const spokeBytes32 = ethers.zeroPadValue(spokeAddress, 32);
  const hubBytes32 = ethers.zeroPadValue(hubAddress, 32);

  console.log("⚙️ Spoke (Berachain) pointe vers le Hub (Ethereum Sepolia)...");
  await (await spoke.setDestinationEid(EID_ETH_SEPOLIA)).wait();
  await (await spoke.setPeer(EID_ETH_SEPOLIA, hubBytes32)).wait();

  console.log("⚙️ Hub (Ethereum) cible l'Inbox Robinhood et le Spoke Berachain...");
  await (await hub.setRobinhoodConfig(DELAYED_INBOX_ETH, wrappedNftAddress)).wait();
  await (await hub.setPeer(EID_BERACHAIN_BEPOLIA, spokeBytes32)).wait();

  console.log("🔐 Robinhood : Transfert des droits de mint au Hub Aliasé...");
  const aliasedHubAddress = applyAlias(hubAddress);
  await (await wrappedNft.transferOwnership(aliasedHubAddress)).wait();

  console.log("✅ WIRING TERMINÉ !");

  // --- PHASE 5 : MISE À JOUR FRONTEND ---
  console.log("\n🤖 Mise à jour des moniteurs (Frontend)...");
  const frontendPath = path.resolve(__dirname, "../../universally-bridge-ui/src/constants/config.ts");

  if (fs.existsSync(frontendPath)) {
    let content = fs.readFileSync(frontendPath, "utf8");
    content = content.replace(/(name:\s*'Berachain bEpolia'[\s\S]*?nftContract:\s*")[^"]*(")/, `$1${nftAddress}$2`);
    content = content.replace(/(name:\s*'Berachain bEpolia'[\s\S]*?bridgeContract:\s*")[^"]*(")/, `$1${spokeAddress}$2`);
    content = content.replace(/(name:\s*'Robinhood L2'[\s\S]*?nftContract:\s*")[^"]*(")/g, `$1${wrappedNftAddress}$2`);
    content = content.replace(/(name:\s*'Robinhood L2'[\s\S]*?bridgeContract:\s*")[^"]*(")/g, `$1${hubAddress}$2`);
    fs.writeFileSync(frontendPath, content);
    console.log(`✨ Fichier config.ts synchronisé.`);
  }

  console.log("\n🏁 SÉQUENCE COMPLÈTE TERMINÉE. LA MONOPLACE EST PRÊTE.");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});