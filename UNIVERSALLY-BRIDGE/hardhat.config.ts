import { HardhatUserConfig } from "hardhat/config";
import "@nomicfoundation/hardhat-toolbox";
import * as dotenv from "dotenv";

dotenv.config();

const config: HardhatUserConfig = {
  solidity: {
    version: "0.8.20",
    settings: {
      viaIR: true, // 🔥 Contourne le "Stack too deep"
      optimizer: {
        enabled: true,
        runs: 200,
      },
    },
  },
  networks: {
    // Le Pit Stop L1
    sepolia: {
      url: "https://rpc.sepolia.org",
      accounts: process.env.PRIVATE_KEY ? [process.env.PRIVATE_KEY] : []
    },
    // L'ancienne source
    base_sepolia: {
      url: "https://sepolia.base.org",
      accounts: process.env.PRIVATE_KEY ? [process.env.PRIVATE_KEY] : []
    },
    // NOUVELLE SOURCE : Berachain bEpolia
    berachain: {
      url: process.env.BEPOLIA_RPC || "https://bepolia.rpc.berachain.com/",
      accounts: process.env.PRIVATE_KEY ? [process.env.PRIVATE_KEY] : [],
      chainId: 80069
    }
  }
};

export default config;