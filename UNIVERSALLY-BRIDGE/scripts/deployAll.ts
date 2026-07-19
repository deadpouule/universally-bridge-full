import hre from "hardhat";
import fs from "fs";
import path from "path";

const ethers = (hre as any).ethers;

// EIDs MAINNET OFFICIELS LAYERZERO V2
const EID_ROBINHOOD = 30416;
const LZ_ENDPOINT_MAINNET = "0x1a44076050125825900e736c501f859c50fE728c";

async function main() {
  const isLocal = hre.network.name === "localhost" || hre.network.name === "hardhat";
  console.log(`🚀 DÉMARRAGE DE LA SÉQUENCE DE DÉPLOIEMENT EN MODE : ${isLocal ? "LOCAL (MOCK)" : "MAINNET"}\n`);

  const privateKey = process.env.PRIVATE_KEY || process.env.DEPLOY_KEY || process.env.PK;
  if (!privateKey && !isLocal) throw new Error("⚠️ Clé privée introuvable pour le Mainnet !");

  // --- 1. CONFIGURATION DES RÉSEAUX SOURCES ---
  const networksToDeploy = [
    { name: "Base", rpc: process.env.BASE_RPC || "http://127.0.0.1:8545", eid: 30184 },
    { name: "Ethereum", rpc: process.env.ETH_RPC || "http://127.0.0.1:8545", eid: 30101 },
    { name: "Berachain", rpc: process.env.BERA_RPC || "http://127.0.0.1:8545", eid: 30362 },
    { name: "Monad", rpc: process.env.MONAD_RPC || "http://127.0.0.1:8545", eid: 30390 },
    { name: "MegaETH", rpc: process.env.MEGAETH_RPC || "http://127.0.0.1:8545", eid: 30398 },
  ];

  const rhRpc = process.env.ROBINHOOD_RPC || "http://127.0.0.1:8545";
  const rhProvider = new ethers.JsonRpcProvider(rhRpc);
  // En local on prend le signer Hardhat par défaut, sinon on injecte la PK
  const rhSigner = isLocal ? (await ethers.getSigners())[0] : new ethers.Wallet(privateKey, rhProvider);

  let lzEndpointAddress = LZ_ENDPOINT_MAINNET;

  // --- 2. GESTION DU MOCK LOCAL ---
  if (isLocal) {
    console.log("🛠️ Déploiement du MockEndpointV2 pour tests locaux...");
    const MockFactory = await ethers.getContractFactory("MockEndpointV2", rhSigner);
    const mock = await MockFactory.deploy();
    await mock.waitForDeployment();
    lzEndpointAddress = await mock.getAddress();
    console.log(`✅ Mock Endpoint déployé à : ${lzEndpointAddress}\n`);
  }

  // --- 3. DÉPLOIEMENT SUR ROBINHOOD (DESTINATION) ---
  console.log(`🎯 DÉPLOIEMENT DESTINATION (ROBINHOOD)...`);
  const WrappedNFT = await ethers.getContractFactory("RobinhoodWrappedNFT", rhSigner);
  const rhContract = await WrappedNFT.deploy(lzEndpointAddress, rhSigner.address);
  await rhContract.waitForDeployment();
  const rhAddress = await rhContract.getAddress();
  const rhBytes32 = ethers.zeroPadValue(rhAddress, 32);
  console.log(`✅ RobinhoodWrappedNFT déployé : ${rhAddress}\n`);

  let frontendConfig = "";

  // --- 4. BOUCLE DE DÉPLOIEMENT SUR TOUTES LES SOURCES ---
  for (const net of networksToDeploy) {
    console.log(`🌍 DÉPLOIEMENT SUR ${net.name.toUpperCase()}...`);
    try {
      const provider = new ethers.JsonRpcProvider(net.rpc);
      const signer = isLocal ? (await ethers.getSigners())[0] : new ethers.Wallet(privateKey, provider);

      // Déploiement du NFT de Test
      const TestNFT = await ethers.getContractFactory("TestNFT", signer);
      const nft = await TestNFT.deploy();
      await nft.waitForDeployment();
      const nftAddress = await nft.getAddress();

      // Déploiement du Spoke
      const Bridge = await ethers.getContractFactory("OmnichainNFTBridge", signer);
      const bridge = await Bridge.deploy(lzEndpointAddress, signer.address);
      await bridge.waitForDeployment();
      const bridgeAddress = await bridge.getAddress();
      const bridgeBytes32 = ethers.zeroPadValue(bridgeAddress, 32);

      console.log(`✅ TestNFT déployé : ${nftAddress}`);
      console.log(`✅ Bridge déployé : ${bridgeAddress}`);

      // Câblage Pair à Pair
      console.log(`⚙️ Câblage ${net.name} -> Robinhood...`);
      await (await bridge.setPeer(EID_ROBINHOOD, rhBytes32)).wait();

      console.log(`⚙️ Câblage Robinhood -> ${net.name}...`);
      await (await rhContract.setPeer(net.eid, bridgeBytes32)).wait();

      // Enregistrement pour le Front-End
      frontendConfig += `
      // ${net.name}
      export const ${net.name.toUpperCase()}_NFT = "${nftAddress}";
      export const ${net.name.toUpperCase()}_BRIDGE = "${bridgeAddress}";`;
      
      console.log(`✅ Réseau ${net.name} câblé avec succès !\n`);
    } catch (e) {
      console.log(`❌ Échec sur ${net.name}. RPC injoignable ou erreur de déploiement.\n`);
    }
  }

  // --- 5. SYNCHRONISATION FRONTEND ---
  frontendConfig += `\nexport const ROBINHOOD_NFT = "${rhAddress}";`;
  const frontendPath = path.resolve(__dirname, "../../universally-bridge-ui/src/constants/deployments.ts");
  if (fs.existsSync(path.dirname(frontendPath))) {
    fs.writeFileSync(frontendPath, frontendConfig);
    console.log(`✨ Fichier deployments.ts généré pour le Frontend.`);
  }

  console.log("\n🏁 SÉQUENCE OMNICHAIN P2P TERMINÉE.");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});