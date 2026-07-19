import hre from "hardhat";
import fs from "fs";
import path from "path";

const ethers = (hre as any).ethers;
const delay = (ms: number) => new Promise(res => setTimeout(res, ms));

function applyAlias(address: string): string {
  const offset = BigInt("0x1111000000000000000000000000000000001111");
  const addrBigInt = BigInt(address);
  const mask = BigInt("0xFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFF");
  return ethers.toBeHex((addrBigInt + offset) & mask, 20);
}

// 📡 Radar intelligent pour trouver le bon Endpoint LayerZero
async function resolveEndpoint(provider: any, networkName: string): Promise<string> {
  const testnetEndpoint = "0x6EDCE65403992e310A62460808c4b910D972f10f"; // Standard Testnet V2
  const mainnetEndpoint = "0x1a44076050125825900e736c501f859c50fE728c"; // Standard Universel LZ V2

  try {
    if ((await provider.getCode(testnetEndpoint)) !== "0x") return testnetEndpoint;
    if ((await provider.getCode(mainnetEndpoint)) !== "0x") return mainnetEndpoint;
  } catch (e) {
    console.warn(`⚠️ Avertissement RPC sur ${networkName}.`);
  }
  
  // Si on ne trouve rien (RPC lag), on force l'adresse de testnet par sécurité
  return testnetEndpoint;
}

async function main() {
  console.log("🚀 DÉMARRAGE DE LA SÉQUENCE OMNICHAIN (BASE + BERA -> ETH -> ROBINHOOD)...\n");

  const privateKey = process.env.PRIVATE_KEY || process.env.DEPLOY_KEY || process.env.PK;
  if (!privateKey) throw new Error("⚠️ Clé privée introuvable !");

  const baseProvider = new ethers.JsonRpcProvider("https://sepolia.base.org");
  const baseSigner = new ethers.Wallet(privateKey, baseProvider);
  
  const beraProvider = new ethers.JsonRpcProvider(process.env.BEPOLIA_RPC || "https://bepolia.rpc.berachain.com/");
  const beraSigner = new ethers.Wallet(privateKey, beraProvider);

  const ethProvider = new ethers.JsonRpcProvider(process.env.ETH_SEPOLIA_RPC || "https://ethereum-sepolia-rpc.publicnode.com");
  const ethSigner = new ethers.Wallet(privateKey, ethProvider);

  const rhProvider = new ethers.JsonRpcProvider(process.env.ROBINHOOD_RPC || "https://sepolia-rollup.arbitrum.io/rpc");
  const rhSigner = new ethers.Wallet(privateKey, rhProvider);

  // ==========================================
  // ⛽ PHASE 1 : LE HUB (ETHEREUM SEPOLIA)
  // ==========================================
  console.log("\n--- ⛽ PHASE 1 : DÉPLOIEMENT DU HUB (ETHEREUM) ---");
  const lzEndpointEth = await resolveEndpoint(ethProvider, "Ethereum");
  
  const HubBridgeL1 = await ethers.getContractFactory("HubBridgeL1", ethSigner);
  const hub = await HubBridgeL1.deploy(lzEndpointEth, ethSigner.address);
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

  const DELAYED_INBOX_ETH = "0xF2939afA86F6f933A3CE17fCAB007907B6b0B7a4";
  console.log("⚙️ Configuration du Hub pour le réseau Robinhood...");
  await (await hub.setRobinhoodConfig(DELAYED_INBOX_ETH, wrappedNftAddress, { gasLimit: 200000 })).wait();

  const hubBytes32 = ethers.zeroPadValue(hubAddress, 32);

  // ==========================================
  // 🌍 PHASE 3 : SOURCE 1 (BASE SEPOLIA)
  // ==========================================
  console.log("\n--- 🌍 PHASE 3 : DÉPLOIEMENT SOURCE 1 (BASE) ---");
  const lzEndpointBase = await resolveEndpoint(baseProvider, "Base");

  const TestNFT_Base = await ethers.getContractFactory("TestNFT", baseSigner);
  const nftBase = await TestNFT_Base.deploy();
  await nftBase.waitForDeployment();
  const nftBaseAddress = await nftBase.getAddress();
  console.log(`✅ TestNFT (Base) déployé : ${nftBaseAddress}`);

  const SpokeBridge_Base = await ethers.getContractFactory("SpokeBridgeL1", baseSigner);
  const spokeBase = await SpokeBridge_Base.deploy(lzEndpointBase, baseSigner.address);
  await spokeBase.waitForDeployment();
  const spokeBaseAddress = await spokeBase.getAddress();
  console.log(`✅ SpokeBridge (Base) déployé : ${spokeBaseAddress}`);

  console.log("💤 Pause RPC Base...");
  await delay(3000);

  const EID_ETH = 40161; 
  const EID_BASE = 40245; 
  const spokeBaseBytes32 = ethers.zeroPadValue(spokeBaseAddress, 32);

  console.log("⚙️ Câblage Base -> Eth...");
  await (await spokeBase.setDestinationEid(EID_ETH, { gasLimit: 100000 })).wait();
  await (await spokeBase.setPeer(EID_ETH, hubBytes32, { gasLimit: 100000 })).wait();
  
  console.log("⚙️ Câblage Eth -> Base...");
  await (await hub.setPeer(EID_BASE, spokeBaseBytes32, { gasLimit: 100000 })).wait();
  console.log("🔗 WIRING BASE <-> ETH TERMINÉ !");

  // ==========================================
  // 🐻 PHASE 4 : SOURCE 2 (BERACHAIN BEPOLIA)
  // ==========================================
  console.log("\n--- 🐻 PHASE 4 : DÉPLOIEMENT SOURCE 2 (BERACHAIN) ---");
  let nftBeraAddress = "";
  let spokeBeraAddress = "";

  try {
    const lzEndpointBera = await resolveEndpoint(beraProvider, "Berachain");

    const TestNFT_Bera = await ethers.getContractFactory("TestNFT", beraSigner);
    const nftBera = await TestNFT_Bera.deploy({ gasLimit: 3000000 });
    await nftBera.waitForDeployment();
    nftBeraAddress = await nftBera.getAddress();
    console.log(`✅ TestNFT (Berachain) déployé : ${nftBeraAddress}`);

    const SpokeBridge_Bera = await ethers.getContractFactory("SpokeBridgeL1", beraSigner);
    const spokeBera = await SpokeBridge_Bera.deploy(lzEndpointBera, beraSigner.address, { gasLimit: 5000000 });
    await spokeBera.waitForDeployment();
    spokeBeraAddress = await spokeBera.getAddress();
    console.log(`✅ SpokeBridge (Berachain) déployé : ${spokeBeraAddress}`);

    console.log("💤 Pause RPC Berachain...");
    await delay(3000);

    const EID_BERA = 40371; 
    const spokeBeraBytes32 = ethers.zeroPadValue(spokeBeraAddress, 32);

    console.log("⚙️ Câblage Berachain -> Eth...");
    await (await spokeBera.setDestinationEid(EID_ETH, { gasLimit: 100000 })).wait();
    await (await spokeBera.setPeer(EID_ETH, hubBytes32, { gasLimit: 100000 })).wait();

    console.log("⚙️ Câblage Eth -> Berachain...");
    await (await hub.setPeer(EID_BERA, spokeBeraBytes32, { gasLimit: 100000 })).wait();
    console.log("🔗 WIRING BERACHAIN <-> ETH TERMINÉ !");
  } catch (error) {
    console.error("\n⚠️ ÉCHEC SUR BERACHAIN : Le réseau bEpolia ou son Endpoint LayerZero est temporairement indisponible.");
    console.log("👉 Pas de panique : La monoplace continue la course avec Base et Ethereum !\n");
  }

  // ==========================================
  // 🤖 PHASE 5 : MISE À JOUR FRONTEND
  // ==========================================
  console.log("\n--- 🤖 PHASE 5 : SYNCHRONISATION FRONTEND ---");
  const frontendPath = path.resolve(__dirname, "../../universally-bridge-ui/src/constants/config.ts");

  if (fs.existsSync(frontendPath)) {
    let content = fs.readFileSync(frontendPath, "utf8");

    // Mise à jour de Base (Garantie)
    content = content.replace(/(name:\s*'Base Sepolia'[\s\S]*?nftContract:\s*")[^"]*(")/, `$1${nftBaseAddress}$2`);
    content = content.replace(/(name:\s*'Base Sepolia'[\s\S]*?bridgeContract:\s*")[^"]*(")/, `$1${spokeBaseAddress}$2`);
    
    // Mise à jour de Robinhood (Garantie)
    content = content.replace(/(name:\s*'Robinhood L2'[\s\S]*?nftContract:\s*")[^"]*(")/g, `$1${wrappedNftAddress}$2`);
    content = content.replace(/(name:\s*'Robinhood L2'[\s\S]*?bridgeContract:\s*")[^"]*(")/g, `$1${hubAddress}$2`);

    // Mise à jour de Berachain (Seulement si succès)
    if (nftBeraAddress && spokeBeraAddress) {
        content = content.replace(/(name:\s*'Berachain bEpolia'[\s\S]*?nftContract:\s*")[^"]*(")/, `$1${nftBeraAddress}$2`);
        content = content.replace(/(name:\s*'Berachain bEpolia'[\s\S]*?bridgeContract:\s*")[^"]*(")/, `$1${spokeBeraAddress}$2`);
    }

    fs.writeFileSync(frontendPath, content);
    console.log(`✨ Fichier config.ts synchronisé avec succès.`);
  }

  console.log("\n🏁 SÉQUENCE OMNICHAIN COMPLÈTE TERMINÉE.");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});