import hre from "hardhat";
const ethers = (hre as any).ethers;
const network = (hre as any).network;

async function main() {
  if (network.name !== "robinhoodTestnet") {
    throw new Error("Ce script doit être lancé sur le réseau robinhoodTestnet !");
  }

  const hubAddress = "0x8F1099dBC4BeDd1d3Dc586754c136986F6295083";
  const wnftAddress = "0x0496fe14Db7FB5ffB119ACB10488c746c2a89B60";
  const realNftL1 = "0xA83bf30c9D0828b297095d80851A2E3CF96ff1aD";

  const HubBridge = await ethers.getContractFactory("HubBridge");
  const hubL2 = HubBridge.attach(hubAddress);

  console.log("Mise à jour de la liaison sur le L2 en cours...");
  
  const tx = await (hubL2 as any).setWrappedNFT(realNftL1, wnftAddress);
  await tx.wait();
  
  console.log(`✅ Succès ! Le HubBridge L2 acceptera désormais les transferts de la collection : ${realNftL1}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});