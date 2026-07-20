// src/utils/network.ts

// Déclaration globale pour autoriser window.ethereum sans erreur TypeScript
declare global {
    interface Window {
      ethereum?: any;
    }
  }
  
  // Le dictionnaire complet des réseaux avec leurs Chain IDs et RPC
  export const CHAIN_CONFIGS: Record<number, any> = {
    1: {
      chainId: "0x1",
      chainName: "Ethereum Mainnet",
      nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 },
      rpcUrls: ["https://eth-mainnet.g.alchemy.com/v2/ozz2M6FYJRXDEfJ-Huqx8"],
      blockExplorerUrls: ["https://etherscan.io"],
    },
    8453: {
      chainId: "0x2105",
      chainName: "Base Mainnet",
      nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 },
      rpcUrls: ["https://base-mainnet.g.alchemy.com/v2/ozz2M6FYJRXDEfJ-Huqx8"],
      blockExplorerUrls: ["https://basescan.org"],
    },
    80094: {
      chainId: "0x138e6",
      chainName: "Berachain Mainnet",
      nativeCurrency: { name: "BERA", symbol: "BERA", decimals: 18 },
      rpcUrls: ["https://berachain-mainnet.g.alchemy.com/v2/ozz2M6FYJRXDEfJ-Huqx8"],
      blockExplorerUrls: ["https://berachainscan.com"],
    },
    143: {
      chainId: "0x8f",
      chainName: "Monad Mainnet",
      nativeCurrency: { name: "MONAD", symbol: "MONAD", decimals: 18 },
      rpcUrls: ["https://monad-mainnet.g.alchemy.com/v2/ozz2M6FYJRXDEfJ-Huqx8"],
      blockExplorerUrls: ["https://explorer.monad.xyz"],
    },
    4326: {
      chainId: "0x10e6",
      chainName: "MegaETH Mainnet",
      nativeCurrency: { name: "MEGA", symbol: "MEGA", decimals: 18 },
      rpcUrls: ["https://megaeth-mainnet.g.alchemy.com/v2/ozz2M6FYJRXDEfJ-Huqx8"],
      blockExplorerUrls: ["https://explorer.megaeth.systems"],
    },
    4663: {
      chainId: "0x1237",
      chainName: "Robinhood Chain",
      nativeCurrency: { name: "RH", symbol: "RH", decimals: 18 },
      rpcUrls: ["https://robinhood-mainnet.g.alchemy.com/v2/ozz2M6FYJRXDEfJ-Huqx8"],
      blockExplorerUrls: ["https://robinhoodchain.blockscout.com"],
    }
  };
  
  /**
   * Fonction sécurisée pour basculer le wallet de l'utilisateur sur le bon réseau.
   * Si le réseau est inconnu de MetaMask/Rabby, elle propose de l'ajouter.
   */
  export async function switchWalletNetwork(targetChainId: number) {
    if (!window.ethereum) throw new Error("Wallet non détecté");
  
    const hexChainId = `0x${targetChainId.toString(16)}`;
  
    try {
      // 1. Tente de basculer sur le réseau
      await window.ethereum.request({
        method: "wallet_switchEthereumChain",
        params: [{ chainId: hexChainId }],
      });
    } catch (switchError: any) {
      // 2. Le code 4902 signifie que la chaîne n'a pas encore été ajoutée au wallet
      if (switchError.code === 4902) {
        const config = CHAIN_CONFIGS[targetChainId];
        if (!config) throw new Error(`Configuration manquante pour le réseau ${targetChainId}`);
        
        try {
          await window.ethereum.request({
            method: "wallet_addEthereumChain",
            params: [config],
          });
        } catch (addError) {
          throw new Error("L'utilisateur a refusé d'ajouter le réseau.");
        }
      } else {
        throw switchError; // Relance l'erreur si ce n'est pas lié à l'absence du réseau
      }
    }
  }