// On importe les adresses générées automatiquement par le script Hardhat
// (S'il y a une erreur TypeScript ici avant le premier déploiement, c'est normal)
import * as deployments from "./deployments";

export const ALCHEMY_API_KEY = "ozz2M6FYJRXDEfJ-Huqx8"; // Remplace par ta vraie clé en prod

export const SUPPORTED_CHAINS = [
  { 
    id: '8453', 
    hex: '0x2105', 
    name: 'Base Mainnet', 
    type: 'Ethereum', 
    color: '#0052ff',
    rpc: 'https://mainnet.base.org',
    nftContract: deployments?.BASE_NFT || "",
    bridgeContract: deployments?.BASE_BRIDGE || ""
  },
  { 
    id: '1', 
    hex: '0x1', 
    name: 'Ethereum Mainnet', 
    type: 'Ethereum', 
    color: '#8892f1',
    rpc: 'https://eth.llamarpc.com',
    nftContract: deployments?.ETHEREUM_NFT || "",
    bridgeContract: deployments?.ETHEREUM_BRIDGE || ""
  },
  { 
    id: '80094', 
    hex: '0x138de', 
    name: 'Berachain Mainnet', 
    type: 'Bear', 
    color: '#ff8b8b',
    rpc: 'https://rpc.berachain.com',
    nftContract: deployments?.BERACHAIN_NFT || "",
    bridgeContract: deployments?.BERACHAIN_BRIDGE || ""
  },
  { 
    id: '143', 
    hex: '0x8f', 
    name: 'Monad Mainnet', 
    type: 'Ethereum', 
    color: '#836EF9',
    rpc: 'https://rpc.monad.xyz',
    nftContract: deployments?.MONAD_NFT || "",
    bridgeContract: deployments?.MONAD_BRIDGE || ""
  },
  { 
    id: '4326', 
    hex: '0x10e6', 
    name: 'MegaETH Mainnet', 
    type: 'Ethereum', 
    color: '#ff0000',
    rpc: 'https://rpc.megaeth.systems',
    nftContract: deployments?.MEGAETH_NFT || "",
    bridgeContract: deployments?.MEGAETH_BRIDGE || ""
  }
];