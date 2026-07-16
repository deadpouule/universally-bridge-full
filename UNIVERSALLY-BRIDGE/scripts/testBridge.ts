import hre from "hardhat";
const ethers = (hre as any).ethers;
const network = (hre as any).network;

async function main() {
  if (network.name !== "sepolia") {
    throw new Error("Ce script de test doit être exécuté sur Sepolia (L1) !");
  }

  const [signer] = await ethers.getSigners();
  console.log(`Exécution du test depuis le compte : ${signer.address}`);

  const spokeL1Address = "0x1b37fc128F504A974c31cb89eb56704782DeaB54";
  const nftL1Address = "0xA83bf30c9D0828b297095d80851A2E3CF96ff1aD";
  const tokenId = 1;

  const hubL2Address = "0x2EB2F57562585f62a2264d8e3866c257A1c9ca15";

  const SpokeBridgeL1 = await ethers.getContractFactory("SpokeBridgeL1");
  const spokeBridge = SpokeBridgeL1.attach(spokeL1Address);

  const TestNFT = await ethers.getContractFactory("TestNFT");
  const nft = TestNFT.attach(nftL1Address);

  console.log("Mise à jour de la cible L2 sur le SpokeBridgeL1...");
  const txLink = await (spokeBridge as any).setL2HubBridge(hubL2Address);
  await txLink.wait();
  console.log("✅ SpokeBridgeL1 connecté au nouveau HubBridge L2.");

  console.log(`Approbation du TestNFT #${tokenId} en cours...`);
  const txApprove = await (nft as any).approve(spokeL1Address, tokenId);
  await txApprove.wait();
  console.log("✅ Jeton approuvé.");

  console.log("Initiation du bridge cross-chain (L1 -> L2)...");

  const maxSubmissionCost = ethers.parseEther("0.005"); 
  const gasLimit = 300000; 
  const maxFeePerGas = ethers.parseUnits("0.1", "gwei"); 
  const totalValue = maxSubmissionCost + (BigInt(gasLimit) * maxFeePerGas);

  const txBridge = await (spokeBridge as any).bridgeNFT(
    nftL1Address,
    tokenId,
    maxSubmissionCost,
    gasLimit,
    maxFeePerGas,
    { value: totalValue }
  );
  
  const receipt = await txBridge.wait();
  console.log(`\n🚀 SANS ERREUR ! NFT envoyé avec succès.`);
  console.log(`Transaction de bridge validée sur Sepolia : ${receipt.hash}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});