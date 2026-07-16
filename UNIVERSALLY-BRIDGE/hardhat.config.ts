require("@nomicfoundation/hardhat-toolbox");
require("dotenv").config(); // Assure-toi d'avoir dotenv pour cacher ta clé privée

module.exports = {
  solidity: "0.8.20",
  networks: {
    // Celui que tu as déjà
    sepolia: {
      url: "https://rpc.sepolia.org",
      accounts: [process.env.PRIVATE_KEY] 
    },
    // NOUVEAU : Base Sepolia
    base_sepolia: {
      url: "https://sepolia.base.org",
      accounts: [process.env.PRIVATE_KEY]
    },
    // NOUVEAU : Berachain Testnet (Artio/bArtio selon la version actuelle)
    berachain_test: {
      url: "https://artio.rpc.berachain.com", // Ou l'URL RPC la plus récente de Berachain
      accounts: [process.env.PRIVATE_KEY]
    }
  }
};