import hre from "hardhat";
import fs from "fs";
import path from "path";

const ethers = (hre as any).ethers;
const delay = (ms: number) => new Promise(res => setTimeout(res, ms));

async function main() {
  console.log("🐻 DÉMARRAGE DE L'OPÉRATION BERACHAIN...\n");

  const privateKey = process.env.PRIVATE_KEY || process.env.DEPLOY_KEY || process.env.PK;
  if (!privateKey) throw new Error("⚠️ Clé privée introuvable !");

  const beraProvider = new ethers.JsonRpcProvider(process.env.BEPOLIA_RPC || "https://bepolia.rpc.berachain.com/");
  const beraSigner = new ethers.Wallet(privateKey, beraProvider);

  const ethProvider = new ethers.JsonRpcProvider(process.env.ETH_SEPOLIA_RPC || "https://ethereum-sepolia-rpc.publicnode.com");
  const ethSigner = new ethers.Wallet(privateKey, ethProvider);

  // 🎯 L'Adresse de ton Hub Ethereum (déjà déployé avec succès)
  const HUB_ADDRESS = "0x1dd67E20f3045991a5d84f0d576d00285b91Bcd2";
  const HubContract = await ethers.getContractAt("HubBridgeL1", HUB_ADDRESS, ethSigner);

  // 🔥 LE CORRECTIF : L'adresse universelle officielle LayerZero V2 confirmée par la documentation
  const lzEndpointBerachain = "0x1a44076050125825900e736c501f859c50fE728c";

  console.log("⏳ Déploiement TestNFT sur Berachain...");
  const TestNFT_Bera = await ethers.getContractFactory("TestNFT", beraSigner);
  const nftBera = await TestNFT_Bera.deploy({ gasLimit: 3000000 });
  await nftBera.waitForDeployment();
  const nftBeraAddress = await nftBera.getAddress();
  console.log(`✅ TestNFT (Berachain) déployé : ${nftBeraAddress}`);

  console.log("⏳ Déploiement SpokeBridge sur Berachain avec l'Endpoint V2 Officiel...");
  const SpokeBridge_Bera = await ethers.getContractFactory("SpokeBridgeL1", beraSigner);
  
  // Utilisation de l'adresse officielle 0x1a44...
  const spokeBera = await SpokeBridge_Bera.deploy(lzEndpointBerachain, beraSigner.address, { gasLimit: 5000000 });
  await spokeBera.waitForDeployment();
  const spokeBeraAddress = await spokeBera.getAddress();
  console.log(`✅ SpokeBridge (Berachain) déployé : ${spokeBeraAddress}`);

  console.log("💤 Pause de synchronisation RPC...");
  await delay(5000);

  const EID_ETH = 40161;
  const EID_BERA = 40371;
  const hubBytes32 = ethers.zeroPadValue(HUB_ADDRESS, 32);
  const spokeBeraBytes32 = ethers.zeroPadValue(spokeBeraAddress, 32);

  console.log("⚙️ Câblage Berachain -> Eth...");
  await (await spokeBera.setDestinationEid(EID_ETH, { gasLimit: 100000 })).wait();
  await (await spokeBera.setPeer(EID_ETH, hubBytes32, { gasLimit: 100000 })).wait();

  console.log("⚙️ Câblage Eth -> Berachain...");
  await (await HubContract.setPeer(EID_BERA, spokeBeraBytes32, { gasLimit: 100000 })).wait();
  console.log("🔗 WIRING BERACHAIN <-> ETH TERMINÉ !");

  console.log("\n🤖 Mise à jour Frontend...");
  const frontendPath = path.resolve(__dirname, "../../universally-bridge-ui/src/constants/config.ts");
  
  if (fs.existsSync(frontendPath)) {
    let content = fs.readFileSync(frontendPath, "utf8");
    content = content.replace(/(name:\s*'Berachain bEpolia'[\s\S]*?nftContract:\s*")[^"]*(")/, `$1${nftBeraAddress}$2`);
    content = content.replace(/(name:\s*'Berachain bEpolia'[\s\S]*?bridgeContract:\s*")[^"]*(")/, `$1${spokeBeraAddress}$2`);
    fs.writeFileSync(frontendPath, content);
    console.log(`✨ Fichier config.ts synchronisé avec Berachain.`);
  }

  console.log("\n🏁 BERACHAIN EST EN LIGNE ET CONNECTÉ AU HUB ! LA MONOPLACE EST COMPLÈTE.");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});