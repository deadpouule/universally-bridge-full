import hre from "hardhat";
import fs from "fs";
import path from "path";

const ethers = (hre as any).ethers;

// 🧮 Calcul de l'Alias d'adresse (Sécurité L1 -> L2)
function applyAlias(address: string): string {
  const offset = BigInt("0x1111000000000000000000000000000000001111");
  const addrBigInt = BigInt(address);
  const mask = BigInt("0xFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFF");
  const aliased = (addrBigInt + offset) & mask;
  return ethers.toBeHex(aliased, 20);
}

async function main() {
  console.log("🚀 DÉMARRAGE DE LA SÉQUENCE OMNICHAIN (BASE + BERA -> ETH -> ROBINHOOD)...\n");

  const privateKey = process.env.PRIVATE_KEY || process.env.DEPLOY_KEY || process.env.PK;
  if (!privateKey) throw new Error("⚠️ Clé privée introuvable !");

  // ==========================================
  // 📡 INITIALISATION DES 4 CANAUX DE TÉLÉMÉTRIE
  // ==========================================
  
  // 1. Base Sepolia (Spoke 1)
  const baseProvider = new ethers.JsonRpcProvider("https://sepolia.base.org");
  const baseSigner = new ethers.Wallet(privateKey, baseProvider);
  
  // 2. Berachain bEpolia (Spoke 2)
  const beraProvider = new ethers.JsonRpcProvider(process.env.BEPOLIA_RPC || "https://bepolia.rpc.berachain.com/");
  const beraSigner = new ethers.Wallet(privateKey, beraProvider);

  // 3. Ethereum Sepolia (Hub)
  const ethProvider = new ethers.JsonRpcProvider(process.env.ETH_SEPOLIA_RPC || "https://ethereum-sepolia-rpc.publicnode.com");
  const ethSigner = new ethers.Wallet(privateKey, ethProvider);

  // 4. Robinhood L2 (Destination)
  const rhProvider = new ethers.JsonRpcProvider(process.env.ROBINHOOD_RPC || "https://sepolia-rollup.arbitrum.io/rpc");
  const rhSigner = new ethers.Wallet(privateKey, rhProvider);

  const lzEndpointUniversal = "0x6EDCE65403992e310A62460808c4b910D972f10f";

  // ==========================================
  // ⛽ PHASE 1 : LE HUB (ETHEREUM SEPOLIA)
  // ==========================================
  console.log("\n--- ⛽ PHASE 1 : DÉPLOIEMENT DU HUB (ETHEREUM) ---");
  const HubBridgeL1 = await ethers.getContractFactory("HubBridgeL1", ethSigner);
  const hub = await HubBridgeL1.deploy(lzEndpointUniversal);
  await hub.waitForDeployment();
  const hubAddress = await hub.getAddress();
  console.log(`✅ HubBridgeL1 déployé : ${hubAddress}`);

  console.log("⏳ Ravitaillement du Hub (0.01 ETH)...");
  await (await ethSigner.sendTransaction({ to: hubAddress, value: ethers.parseEther("0.01") })).wait();
  console.log("✅ Réservoir rempli !");

  // ==========================================
  // 🎯 PHASE 2 : LA DESTINATION (ROBINHOOD)
  // ==========================================
  console.log("\n--- 🎯 PHASE 2 : DÉPLOIEMENT DESTINATION (ROBINHOOD) ---");
  const WrappedNFT = await ethers.getContractFactory("WrappedNFT", rhSigner);
  const wrappedNft = await WrappedNFT.deploy();
  await wrappedNft.waitForDeployment();
  const wrappedNftAddress = await wrappedNft.getAddress();
  console.log(`✅ WrappedNFT déployé : ${wrappedNftAddress}`);

  const aliasedHubAddress = applyAlias(hubAddress);
  console.log("👑 Transfert des droits de mint au Hub Aliasé...");
  await (await wrappedNft.transferOwnership(aliasedHubAddress)).wait();

  // Configuration du Hub vers Robinhood
  const DELAYED_INBOX_ETH = "0xF2939afA86F6f933A3CE17fCAB007907B6b0B7a4";
  await (await hub.setRobinhoodConfig(DELAYED_INBOX_ETH, wrappedNftAddress)).wait();

  const hubBytes32 = ethers.zeroPadValue(hubAddress, 32);

  // ==========================================
  // 🌍 PHASE 3 : SOURCE 1 (BASE SEPOLIA)
  // ==========================================
  console.log("\n--- 🌍 PHASE 3 : DÉPLOIEMENT SOURCE 1 (BASE) ---");
  const TestNFT_Base = await ethers.getContractFactory("TestNFT", baseSigner);
  const nftBase = await TestNFT_Base.deploy();
  await nftBase.waitForDeployment();
  const nftBaseAddress = await nftBase.getAddress();
  console.log(`✅ TestNFT (Base) déployé : ${nftBaseAddress}`);

  const SpokeBridge_Base = await ethers.getContractFactory("SpokeBridgeL1", baseSigner);
  // Utilisation du nouveau constructeur sans Oracle
  const spokeBase = await SpokeBridge_Base.deploy(lzEndpointUniversal);
  await spokeBase.waitForDeployment();
  const spokeBaseAddress = await spokeBase.getAddress();
  console.log(`✅ SpokeBridge (Base) déployé : ${spokeBaseAddress}`);

  // Câblage Base <-> Eth
  const EID_ETH = 40161; 
  const EID_BASE = 40245; 
  const spokeBaseBytes32 = ethers.zeroPadValue(spokeBaseAddress, 32);

  await (await spokeBase.setDestinationEid(EID_ETH)).wait();
  await (await spokeBase.setPeer(EID_ETH, hubBytes32)).wait();
  await (await hub.setPeer(EID_BASE, spokeBaseBytes32)).wait();
  console.log("🔗 WIRING BASE <-> ETH TERMINÉ !");

  // ==========================================
  // 🐻 PHASE 4 : SOURCE 2 (BERACHAIN BEPOLIA)
  // ==========================================
  console.log("\n--- 🐻 PHASE 4 : DÉPLOIEMENT SOURCE 2 (BERACHAIN) ---");
  const TestNFT_Bera = await ethers.getContractFactory("TestNFT", beraSigner);
  const nftBera = await TestNFT_Bera.deploy({ gasLimit: 3000000 });
  await nftBera.waitForDeployment();
  const nftBeraAddress = await nftBera.getAddress();
  console.log(`✅ TestNFT (Berachain) déployé : ${nftBeraAddress}`);

  const SpokeBridge_Bera = await ethers.getContractFactory("SpokeBridgeL1", beraSigner);
  const spokeBera = await SpokeBridge_Bera.deploy(lzEndpointUniversal, { gasLimit: 5000000 });
  await spokeBera.waitForDeployment();
  const spokeBeraAddress = await spokeBera.getAddress();
  console.log(`✅ SpokeBridge (Berachain) déployé : ${spokeBeraAddress}`);

  // Câblage Berachain <-> Eth
  const EID_BERA = 40371; 
  const spokeBeraBytes32 = ethers.zeroPadValue(spokeBeraAddress, 32);

  await (await spokeBera.setDestinationEid(EID_ETH)).wait();
  await (await spokeBera.setPeer(EID_ETH, hubBytes32)).wait();
  await (await hub.setPeer(EID_BERA, spokeBeraBytes32)).wait();
  console.log("🔗 WIRING BERACHAIN <-> ETH TERMINÉ !");

  // ==========================================
  // 🤖 PHASE 5 : MISE À JOUR FRONTEND
  // ==========================================
  console.log("\n--- 🤖 PHASE 5 : SYNCHRONISATION FRONTEND ---");
  const frontendPath = path.resolve(__dirname, "../../universally-bridge-ui/src/constants/config.ts");

  if (fs.existsSync(frontendPath)) {
    let content = fs.readFileSync(frontendPath, "utf8");

    // MàJ Base Sepolia
    content = content.replace(/(name:\s*'Base Sepolia'[\s\S]*?nftContract:\s*")[^"]*(")/, `$1${nftBaseAddress}$2`);
    content = content.replace(/(name:\s*'Base Sepolia'[\s\S]*?bridgeContract:\s*")[^"]*(")/, `$1${spokeBaseAddress}$2`);

    // MàJ Berachain
    content = content.replace(/(name:\s*'Berachain bEpolia'[\s\S]*?nftContract:\s*")[^"]*(")/, `$1${nftBeraAddress}$2`);
    content = content.replace(/(name:\s*'Berachain bEpolia'[\s\S]*?bridgeContract:\s*")[^"]*(")/, `$1${spokeBeraAddress}$2`);

    // MàJ Robinhood
    content = content.replace(/(name:\s*'Robinhood L2'[\s\S]*?nftContract:\s*")[^"]*(")/g, `$1${wrappedNftAddress}$2`);
    content = content.replace(/(name:\s*'Robinhood L2'[\s\S]*?bridgeContract:\s*")[^"]*(")/g, `$1${hubAddress}$2`);

    fs.writeFileSync(frontendPath, content);
    console.log(`✨ BINGO ! Fichier config.ts synchronisé avec toutes les sources.`);
  }

  console.log("\n🏁 SÉQUENCE OMNICHAIN COMPLÈTE TERMINÉE.");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});