import hre from "hardhat";
const ethers = (hre as any).ethers;
const network = (hre as any).network;

async function main() {
  if (network.name !== "robinhoodTestnet") {
    throw new Error("Ce script de vérification doit être lancé sur robinhoodTestnet !");
  }

  const [user] = await ethers.getSigners();
  
  const wrappedNftAddress = "0x0496fe14Db7FB5ffB119ACB10488c746c2a89B60";
  const tokenIdToCheck = 1;

  console.log(`Vérification de la réception sur Robinhood Testnet pour le compte : ${user.address}\n`);

  const WrappedNFT = await ethers.getContractFactory("WrappedNFT");
  const wnft = WrappedNFT.attach(wrappedNftAddress);

  try {
    const owner = await (wnft as any).ownerOf(tokenIdToCheck);
    
    console.log(`✨ [SUCCÈS] Le NFT #${tokenIdToCheck} existe bien sur le L2 !`);
    if (owner.toLowerCase() === user.address.toLowerCase()) {
      console.log("🥇 Tu en es officiellement le propriétaire sur Robinhood Chain.");
    } else {
      console.log(`⚠️ Le jeton appartient à une autre adresse : ${owner}`);
    }

    const balance = await (wnft as any).balanceOf(user.address);
    console.log(`📊 Solde total de ton adresse sur cette collection L2 : ${balance.toString()} NFT(s)`);

  } catch (error: any) {
    if (error.message.includes("owner query for nonexistent token") || error.message.includes("ERC721NonexistentToken")) {
      console.log(`⏳ Le NFT #${tokenIdToCheck} n'a pas encore été reçu.`);
      console.log("Le relayeur Arbitrum/Robinhood est peut-être encore en train de traiter le ticket cross-chain (cela prend généralement quelques minutes).");
    } else {
      console.error("Une erreur est survenue lors de la lecture du contrat :", error);
    }
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});