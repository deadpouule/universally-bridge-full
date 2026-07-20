import hre from "hardhat";
import fs from "fs";
import path from "path";

const ethers = (hre as any).ethers;

const EID_ROBINHOOD = 30416;
const RH_ADDRESS = "0x36DD124291f3a3bC5D07E5c945e4685EdaaCD3b2"; 
const rhBytes32 = ethers.zeroPadValue(RH_ADDRESS, 32);

const LZ_ENDPOINT_UNIFIED = "0x6F475642a6e85809B1c36Fa62763669b1b48DD5B";

async function main() {
  console.log(`🚀 DÉPLOIEMENT FINAL : MEGAETH (MODE GAZ NATIF)...\n`);

  const privateKey = process.env.PRIVATE_KEY || process.env.DEPLOY_KEY || process.env.PK;
  if (!privateKey) throw new Error("⚠️ Clé privée introuvable (.env) !");
  if (!process.env.MEGAETH_RPC) throw new Error("⚠️ RPC MegaETH manquant !");

  const rhProvider = new ethers.JsonRpcProvider(process.env.ROBINHOOD_RPC);
  const rhSigner = new ethers.Wallet(privateKey, rhProvider);
  const WrappedNFT = await ethers.getContractFactory("RobinhoodWrappedNFT", rhSigner);
  const rhContract = WrappedNFT.attach(RH_ADDRESS) as any;

  // Récupération de l'existant pour l'UI (Base, Eth, Berachain, Monad)
  let frontendConfig = `
export const BASE_NFT = "0x1AaF43D07f412c0b8EE6Ced18Ce9D8dF4f045D88";
export const BASE_BRIDGE = "0x378510d5724993d06E3002318a90ED0F22055D70";

export const ETHEREUM_NFT = "0xAbd79EE972882eE081cE2166F0C23e5516c3A73C";
export const ETHEREUM_BRIDGE = "0xf1d7bB00e92780011a2C57E0017bA5eC247612F7";

export const BERACHAIN_NFT = "0xD6F92f370323B5b8eDe17658D91BD4E4a521b3d2";
export const BERACHAIN_BRIDGE = "0xb91afb5a36CD758bC7D0CfA21361d53E62316347";

export const MONAD_NFT = "0xA05EE152ae2cbA7989F64db7dA9AAa25E3Be1c8E";
export const MONAD_BRIDGE = "0x1b37fc128F504A974c31cb89eb56704782DeaB54";`;

  console.log(`🌍 DÉPLOIEMENT SUR MEGAETH...`);
  try {
    const provider = new ethers.JsonRpcProvider(process.env.MEGAETH_RPC);
    const signer = new ethers.Wallet(privateKey, provider);

    // 1. Déploiement TestNFT (sans forcer de mauvais objets de frais)
    const TestNFT = await ethers.getContractFactory("TestNFT", signer);
    const nft = await TestNFT.deploy();
    await nft.waitForDeployment();
    const nftAddress = await nft.getAddress();
    console.log(`   ✅ TestNFT : ${nftAddress}`);

    // 2. Déploiement OmnichainNFTBridge
    const Bridge = await ethers.getContractFactory("OmnichainNFTBridge", signer);
    const bridge = await Bridge.deploy(LZ_ENDPOINT_UNIFIED, signer.address);
    await bridge.waitForDeployment();
    const bridgeAddress = await bridge.getAddress();
    const bridgeBytes32 = ethers.zeroPadValue(bridgeAddress, 32);
    console.log(`   ✅ Bridge  : ${bridgeAddress}`);

    // 3. Câblage P2P avec une simple limite de gaz de sécurité
    console.log(`   ⚙️ Liaison MegaETH 🔗 Robinhood...`);
    const tx1 = await bridge.setPeer(EID_ROBINHOOD, rhBytes32, { gasLimit: 300000 });
    await tx1.wait(1);

    console.log(`   ⚙️ Liaison Robinhood 🔗 MegaETH...`);
    const tx2 = await rhContract.setPeer(30398, bridgeBytes32, { gasLimit: 300000 });
    await tx2.wait(1);

    frontendConfig += `
export const MEGAETH_NFT = "${nftAddress}";
export const MEGAETH_BRIDGE = "${bridgeAddress}";`;
    
    console.log(`   ✅ Réseau MegaETH entièrement interconnecté !\n`);
  } catch (e) {
    console.error(`❌ Échec critique sur MegaETH :`, e);
    process.exit(1);
  }

  frontendConfig += `\nexport const ROBINHOOD_NFT = "${RH_ADDRESS}";`;
  
  const uiSrcPath = path.resolve(__dirname, "../../universally-bridge-ui/src");
  const constantsPath = path.join(uiSrcPath, "constants");
  const abisPath = path.join(uiSrcPath, "abis");

  if (!fs.existsSync(constantsPath)) fs.mkdirSync(constantsPath, { recursive: true });
  if (!fs.existsSync(abisPath)) fs.mkdirSync(abisPath, { recursive: true });

  fs.writeFileSync(path.join(constantsPath, "deployments.ts"), frontendConfig);
  console.log(`✨ Fichier 'deployments.ts' mis à jour et synchronisé avec l'UI.`);

  const contractsToSync = ["OmnichainNFTBridge", "RobinhoodWrappedNFT", "TestNFT"];
  contractsToSync.forEach(contractName => {
      const artifactPath = path.resolve(__dirname, `../artifacts/contracts/${contractName}.sol/${contractName}.json`);
      if (fs.existsSync(artifactPath)) {
          const artifact = JSON.parse(fs.readFileSync(artifactPath, "utf8"));
          fs.writeFileSync(path.join(abisPath, `${contractName}.json`), JSON.stringify({ abi: artifact.abi }, null, 2));
      }
  });
  console.log(`📄 ABIs synchronisées.`);
  console.log("\n🏁 MISSION ACCOMPLIE : TOUS LES RÉSEAUX DE PRODUCTION SONT EN LIGNE ET LIÉS !");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});