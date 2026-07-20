// src/services/indexer.ts

export interface NFTData {
    contractAddress: string;
    tokenId: string;
    name: string;
    image: string;
    collectionName: string;
  }
  
  const ALCHEMY_KEY = "ozz2M6FYJRXDEfJ-Huqx8";
  
  export async function fetchAllWalletNFTs(walletAddress: string, chainId: number): Promise<NFTData[]> {
    if (!walletAddress) return [];
  
    // --- 1. SÉCURISATION ALCHEMY (Base & Ethereum Mainnet) ---
    if (chainId === 1 || chainId === 8453) {
      const networkPrefix = chainId === 1 ? "eth-mainnet" : "base-mainnet";
      const url = `https://${networkPrefix}.g.alchemy.com/nft/v3/${ALCHEMY_KEY}/getNFTsForOwner?owner=${walletAddress}&withMetadata=true&excludeFilters[]=SPAM`;
  
      try {
        const response = await fetch(url);
        const data = await response.json();
        
        // Extraction sécurisée pour éviter les crashs si le wallet est vide
        if (!data.ownedNfts) return [];
  
        return data.ownedNfts.map((nft: any) => ({
          contractAddress: nft.contract.address,
          tokenId: nft.tokenId,
          name: nft.name || nft.title || `${nft.contract.name || 'NFT'} #${nft.tokenId}`,
          image: nft.image?.cachedUrl || nft.image?.originalUrl || "https://placehold.co/400x400/000000/ffffff?text=No+Image",
          collectionName: nft.contract.name || "Collection Inconnue"
        }));
      } catch (e) {
        console.error("Erreur d'indexation Alchemy:", e);
        return [];
      }
    }
  
    // --- 2. SÉCURISATION BLOCKSCOUT (Berachain, Monad, MegaETH) ---
    let blockscoutUrl = "";
    if (chainId === 80094) blockscoutUrl = "https://berachain.blockscout.com/api/v2"; // URL Berachain Mainnet officielle Blockscout
    if (chainId === 143) blockscoutUrl = "https://explorer.monad.xyz/api/v2"; 
    if (chainId === 4326) blockscoutUrl = "https://explorer.megaeth.systems/api/v2";
  
    if (blockscoutUrl) {
      try {
        // On interroge le endpoint universel NFT de Blockscout
        const url = `${blockscoutUrl}/addresses/${walletAddress}/nft?type=ERC-721`;
        const response = await fetch(url);
        const data = await response.json();
  
        if (!data.items) return [];
  
        return data.items.map((item: any) => ({
          contractAddress: item.token?.address || "",
          tokenId: item.id || "0",
          name: item.metadata?.name || `${item.token?.name || 'NFT'} #${item.id}`,
          image: item.metadata?.image || item.image_url || "https://placehold.co/400x400/000000/ffffff?text=No+Image",
          collectionName: item.token?.name || "Collection Inconnue"
        }));
      } catch (e) {
        console.error("Erreur d'indexation Blockscout:", e);
        return [];
      }
    }
  
    return [];
  }