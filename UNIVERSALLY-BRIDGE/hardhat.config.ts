import { HardhatUserConfig } from "hardhat/config";
import "@nomicfoundation/hardhat-toolbox";
import * as dotenv from "dotenv";

dotenv.config();

const accounts = process.env.PRIVATE_KEY ? [process.env.PRIVATE_KEY] : [];

const config: HardhatUserConfig = {
  solidity: {
    version: "0.8.20",
    settings: {
      viaIR: true, // 🔥 Contourne le fameux "Stack too deep"
      optimizer: {
        enabled: true,
        runs: 200,
      },
    },
  },
  networks: {
    // --- CONFIGURATIONS DES RÉSEAUX MAINNET ALCHEMY ---
    base: {
      url: process.env.BASE_RPC || "https://base-mainnet.g.alchemy.com/v2/ozz2M6FYJRXDEfJ-Huqx8",
      accounts: accounts,
      chainId: 8453
    },
    ethereum: {
      url: process.env.ETH_RPC || "https://eth-mainnet.g.alchemy.com/v2/ozz2M6FYJRXDEfJ-Huqx8",
      accounts: accounts,
      chainId: 1
    },
    berachain: {
      url: process.env.BERA_RPC || "https://berachain-mainnet.g.alchemy.com/v2/ozz2M6FYJRXDEfJ-Huqx8",
      accounts: accounts,
      chainId: 80094
    },
    monad: {
      url: process.env.MONAD_RPC || "https://monad-mainnet.g.alchemy.com/v2/ozz2M6FYJRXDEfJ-Huqx8",
      accounts: accounts,
      chainId: 143
    },
    megaeth: {
      url: process.env.MEGAETH_RPC || "https://megaeth-mainnet.g.alchemy.com/v2/ozz2M6FYJRXDEfJ-Huqx8",
      accounts: accounts,
      chainId: 4326
    },
    robinhood: {
      url: process.env.ROBINHOOD_RPC || "https://robinhood-mainnet.g.alchemy.com/v2/ozz2M6FYJRXDEfJ-Huqx8",
      accounts: accounts,
      chainId: 4663
    }
  }
};

export default config;