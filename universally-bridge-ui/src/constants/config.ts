export const NFT_ABI = [
    "function approve(address to, uint256 tokenId) external",
    "function getApproved(uint256 tokenId) external view returns (address)",
    "function mint(address to) external"
  ];
  
  export const BRIDGE_ABI = [
    "function bridgeNFT(address _nftContract, uint256 _tokenId, uint256 _maxSubmissionCost, uint256 _gasLimit, uint256 _maxFeePerGas) external payable"
  ];
  
  export const ALCHEMY_API_KEY = "ozz2M6FYJRXDEfJ-Huqx8";
  
  export const SUPPORTED_CHAINS = [
    { 
      id: '11155111', 
      hex: '0xaa36a7', 
      name: 'Eth Sepolia', 
      type: 'Ethereum', 
      color: '#8892f1',
      rpc: 'https://rpc.sepolia.org',
      nftContract: "0xA83bf30c9D0828b297095d80851A2E3CF96ff1aD",
      bridgeContract: "0x1b37fc128F504A974c31cb89eb56704782DeaB54"
    },
    { 
      id: '84532', 
      hex: '0x14a34', 
      name: 'Base Sepolia', 
      type: 'Ethereum', 
      color: '#0052ff',
      rpc: 'https://sepolia.base.org',
      nftContract: "0xa22DbA93B0be604bb610251E00DD89aA8069b03C", // Sera mis à jour par ton script
      bridgeContract: "" // Sera mis à jour par ton script
    },
    { 
      id: '80084', 
      hex: '0x138d4', 
      name: 'Berachain Test', 
      type: 'Bear', 
      color: '#ff8b8b',
      rpc: 'https://artio.rpc.berachain.com',
      nftContract: "",
      bridgeContract: ""
    }
  ];