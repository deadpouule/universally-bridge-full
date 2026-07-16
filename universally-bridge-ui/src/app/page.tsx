"use client";

import React, { useState, useEffect } from 'react';
import { Lock, ArrowRightLeft, Wallet, Square, ChevronDown, Hammer, ImageIcon, Loader2, CheckCircle2, ExternalLink, Clock } from 'lucide-react';
import { ethers } from 'ethers';
import { Network, Alchemy } from "alchemy-sdk";
import { NFT_ABI, BRIDGE_ABI, SUPPORTED_CHAINS, ALCHEMY_API_KEY } from '../constants/config';

export default function UniversallyBridge() {
  const [account, setAccount] = useState<string | null>(null);
  const [status, setStatus] = useState<"idle" | "approving" | "bridging" | "success">("idle");
  const [isMinting, setIsMinting] = useState(false);
  const [txHash, setTxHash] = useState("");
  
  const [activeTab, setActiveTab] = useState<1 | 4>(1); 
  const [crossChainProgress, setCrossChainProgress] = useState<number>(0); 
  
  const [tokenId, setTokenId] = useState("");
  const [selectedChain, setSelectedChain] = useState(SUPPORTED_CHAINS[0]);
  const [isChainDropdownOpen, setIsChainDropdownOpen] = useState(false);
  
  const [ownedNFTs, setOwnedNFTs] = useState<any[]>([]);
  const [selectedNft, setSelectedNft] = useState<any>(null);
  const [isNftDropdownOpen, setIsNftDropdownOpen] = useState(false);
  const [isLoadingNFTs, setIsLoadingNFTs] = useState(false);

  const getAlchemyNetwork = (chainId: string) => {
    if (chainId === '11155111') return Network.ETH_SEPOLIA;
    if (chainId === '84532') return Network.BASE_SEPOLIA;
    return Network.ETH_MAINNET;
  };

  const alchemyConfig = {
    apiKey: ALCHEMY_API_KEY,
    network: getAlchemyNetwork(selectedChain.id),
  };
  const alchemy = new Alchemy(alchemyConfig);

  const fetchUserNFTs = async (walletAddress: string) => {
    setIsLoadingNFTs(true);
    try {
      if (selectedChain.id !== '11155111' && selectedChain.id !== '84532') {
         setOwnedNFTs([]);
         setIsLoadingNFTs(false);
         return;
      }

      const nftsIterable = await alchemy.nft.getNftsForOwner(walletAddress, {
         contractAddresses: [selectedChain.nftContract]
      });
      
      const realNFTs = nftsIterable.ownedNfts.map((nft: any) => {
        let imageUrl = null;
        if (nft.rawMetadata && nft.rawMetadata.image) {
           imageUrl = (nft.rawMetadata.image as string).replace("ipfs://", "https://ipfs.io/ipfs/");
        } else if (nft.image && nft.image.cachedUrl) {
           imageUrl = nft.image.cachedUrl;
        }

        return {
          id: nft.tokenId,
          name: nft.name || nft.rawMetadata?.name || `${selectedChain.name} NFT #${nft.tokenId}`,
          image: imageUrl
        };
      });

      setOwnedNFTs(realNFTs);
    } catch (error) {
      console.error("Erreur d'indexation Alchemy:", error);
      setOwnedNFTs([]);
    } finally {
      setIsLoadingNFTs(false);
    }
  };

  useEffect(() => {
    if (account) {
      setOwnedNFTs([]);
      setSelectedNft(null);
      setTokenId("");
      fetchUserNFTs(account);
    }
  }, [account, selectedChain]);

  useEffect(() => {
    if (activeTab === 4 && status === "success") {
      setCrossChainProgress(1); 
      const timer1 = setTimeout(() => setCrossChainProgress(2), 3000);
      const timer2 = setTimeout(() => setCrossChainProgress(3), 8000);
      return () => { clearTimeout(timer1); clearTimeout(timer2); };
    }
  }, [activeTab, status]);

  const connectWallet = async () => {
    if (typeof (window as any).ethereum !== 'undefined') {
      try {
        const accounts = await (window as any).ethereum.request({ method: 'eth_requestAccounts' });
        setAccount(accounts[0]);
        const currentChainId = await (window as any).ethereum.request({ method: 'eth_chainId' });
        
        if (currentChainId !== selectedChain.hex) {
          try {
            await (window as any).ethereum.request({
              method: 'wallet_switchEthereumChain',
              params: [{ chainId: selectedChain.hex }],
            });
          } catch (switchError: any) {
            if (switchError.code === 4902) {
              await (window as any).ethereum.request({
                method: 'wallet_addEthereumChain',
                params: [{
                  chainId: selectedChain.hex,
                  chainName: selectedChain.name,
                  rpcUrls: [selectedChain.rpc],
                  nativeCurrency: { name: 'ETH', symbol: 'ETH', decimals: 18 }
                }],
              });
            } else if (switchError.code === 4001) {
              alert("Changement de réseau refusé dans MetaMask.");
            }
          }
        }
      } catch (error: any) {
        if (error.code === 4001) alert("Connexion refusée.");
        else console.error("Erreur de connexion", error);
      }
    } else {
      alert("Veuillez installer MetaMask !");
    }
  };

  const handleMint = async () => {
    if (!account) return connectWallet();
    if (!selectedChain.nftContract) return alert(`Contrat non configuré pour ${selectedChain.name}`);

    try {
      setIsMinting(true);
      const provider = new ethers.BrowserProvider((window as any).ethereum);
      const signer = await provider.getSigner();
      const nftContract = new ethers.Contract(selectedChain.nftContract, NFT_ABI, signer);
      const tx = await nftContract["mint(address)"](account); 
      await tx.wait();
      alert(`NFT Test généré avec succès sur ${selectedChain.name} !`);
      fetchUserNFTs(account);
    } catch (error: any) {
      console.error("Erreur Mint:", error);
      alert("Transaction rejetée.");
    } finally {
      setIsMinting(false);
    }
  };

  const handleBridge = async () => {
    if (!account) return connectWallet();
    if (!tokenId) return alert("Veuillez sélectionner un Token ID à bridge.");
    if (!selectedChain.bridgeContract || !selectedChain.nftContract) return alert(`Le pont (bridge) n'est pas encore déployé.`);
    
    try {
      const provider = new ethers.BrowserProvider((window as any).ethereum);
      const signer = await provider.getSigner();
      
      const nftContract = new ethers.Contract(selectedChain.nftContract, NFT_ABI, signer);
      const bridgeContract = new ethers.Contract(selectedChain.bridgeContract, BRIDGE_ABI, signer);

      setStatus("approving");
      const txApprove = await nftContract.approve(selectedChain.bridgeContract, tokenId);
      await txApprove.wait();

      setStatus("bridging");
      const maxSubmissionCost = ethers.parseEther("0.005"); 
      const gasLimit = BigInt(300000); 
      const maxFeePerGas = ethers.parseUnits("0.1", "gwei"); 
      const totalValue = maxSubmissionCost + (gasLimit * maxFeePerGas);

      const txBridge = await bridgeContract.bridgeNFT(
        selectedChain.nftContract,
        tokenId,
        maxSubmissionCost,
        gasLimit,
        maxFeePerGas,
        { 
          value: totalValue,
          gasLimit: BigInt(500000)
        }
      );
      
      const receipt = await txBridge.wait();
      setTxHash(receipt.hash);
      setStatus("success");
      
      setActiveTab(4);
      
    } catch (error: any) {
      console.error("Erreur Bridge:", error);
      setStatus("idle");
      if (error.code === 4001) alert("Transaction annulée par l'utilisateur.");
      else alert(`Échec du Bridge. Vérifiez la console.`);
    }
  };

  const getButtonState = () => {
    if (!account) return { text: "CONNECT WALLET", disabled: false };
    if (!selectedChain.bridgeContract) return { text: "NETWORK NOT SUPPORTED YET", disabled: true };
    if (!tokenId) return { text: "SELECT AN ASSET", disabled: true };
    if (status === "approving") return { text: "APPROVING CONTRACT...", disabled: true };
    if (status === "bridging") return { text: "CROSSING THE BRIDGE...", disabled: true };
    if (status === "success") return { text: "ASSET BRIDGED", disabled: true };
    return { text: "INITIATE BRIDGE", disabled: false };
  };
  const btnState = getButtonState();

  const renderChainIcon = (type: string, color: string) => {
    if (type === 'Bear') {
      return (
        <svg width="18" height="18" viewBox="0 0 24 24" fill={color} xmlns="http://www.w3.org/2000/svg">
          <path d="M12 2C6.48 2 2 6.48 2 12C2 17.52 6.48 22 12 22C17.52 22 22 17.52 22 12C22 6.48 17.52 2 12 2ZM8 10C8.83 10 9.5 10.67 9.5 11.5C9.5 12.33 8.83 13 8 13C7.17 13 6.5 12.33 6.5 11.5C6.5 10.67 7.17 10 8 10ZM16 10C16.83 10 17.5 10.67 17.5 11.5C17.5 12.33 16.83 13 16 13C15.17 13 14.5 12.33 14.5 11.5C14.5 10.67 15.17 10 16 10ZM12 17C10.34 17 9 15.66 9 14H15C15 15.66 13.66 17 12 17Z" />
        </svg>
      );
    }
    return (
      <svg width="18" height="18" viewBox="0 0 32 32" fill={color} xmlns="http://www.w3.org/2000/svg">
        <path d="M15.925 23.969L15.812 24.076V31.737L15.925 32.062L25.642 17.962L15.925 23.969Z" opacity="0.6"/><path d="M15.925 23.969L6.2 17.962L15.925 32.062V23.969Z"/><path d="M15.925 21.654L25.597 15.704L15.925 0L15.812 0.354V21.528L15.925 21.654Z" opacity="0.6"/><path d="M15.925 21.654V0L6.25 15.704L15.925 21.654Z"/>
      </svg>
    );
  };

  return (
    <div className="bridge-container relative flex flex-col items-center pt-16 pb-12 px-4 overflow-hidden" style={{ background: 'linear-gradient(180deg, #a2dbe5 0%, #244f34 100%)', width: '100%', minHeight: '100vh' }}>
      <div className="absolute inset-0 pointer-events-none" style={{ backgroundImage: `linear-gradient(rgba(255, 255, 255, 0.15) 1px, transparent 1px), linear-gradient(90deg, rgba(255, 255, 255, 0.15) 1px, transparent 1px)`, backgroundSize: '40px 40px', backgroundPosition: 'center top' }} />

      <div className="z-10 flex flex-col items-center mb-8 text-center" style={{ marginTop: '2rem' }}>
        <h1 className="font-pixel text-[2.5rem] md:text-[3.5rem] tracking-tight pixel-title" style={{ marginBottom: '0.75rem' }}>UNIVERSALLY</h1>
        <h2 className="text-[11px] font-bold text-[#1b3a29] tracking-[0.2em] uppercase">NFT BRIDGE</h2>
      </div>

      <div className="z-10 w-full bg-[#132a1d] flex flex-col shadow-[0_24px_50px_rgba(15,35,25,0.6)]" style={{ maxWidth: '720px', border: '1px solid #1c3e2a', color: 'white' }}>
        
        <div className="flex justify-between items-center w-full" style={{ backgroundColor: '#173324', borderBottom: '1px solid #1c3e2a', padding: '8px 16px' }}>
          <span style={{ fontSize: '10px', color: '#5b7d68', fontWeight: 'bold', letterSpacing: '0.1em' }}>BRIDGE.EXE</span>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            {account ? (
               <span style={{ fontSize: '10px', color: '#6fd3ee', fontFamily: 'monospace', fontWeight: 'bold' }}>{account.slice(0, 6)}...{account.slice(-4)}</span>
            ) : (
              <button onClick={connectWallet} style={{ background: 'transparent', border: '1px solid #5b7d68', color: '#5b7d68', fontSize: '9px', fontWeight: 'bold', padding: '4px 8px', cursor: 'pointer', letterSpacing: '0.1em' }}>CONNECT</button>
            )}
            <Square size={12} color="#305441" />
          </div>
        </div>

        <div className="flex flex-row w-full" style={{ backgroundColor: '#132a1d', borderBottom: '1px solid #1c3e2a' }}>
          <div 
            onClick={() => setActiveTab(1)}
            className="flex-1 flex justify-center items-center cursor-pointer" 
            style={{ padding: '16px 0', borderBottom: activeTab === 1 ? '2px solid #6fd3ee' : 'none', borderRight: '1px solid #1c3e2a', backgroundColor: activeTab === 1 ? '#183526' : 'transparent' }}
          >
            <span style={{ fontSize: '10px', color: activeTab === 1 ? '#6fd3ee' : '#456b54', fontWeight: 'bold', letterSpacing: '0.1em', display: 'flex', alignItems: 'center' }}>
              <span style={{ border: `1px solid ${activeTab === 1 ? '#6fd3ee' : '#456b54'}`, padding: '2px 6px', marginRight: '8px', borderRadius: '2px' }}>1-3</span> CONFIG
            </span>
          </div>
          <div 
            onClick={() => { if (txHash) setActiveTab(4) }}
            className="flex-1 flex justify-center items-center" 
            style={{ padding: '16px 0', borderBottom: activeTab === 4 ? '2px solid #6fd3ee' : 'none', backgroundColor: activeTab === 4 ? '#183526' : 'transparent', cursor: txHash ? 'pointer' : 'not-allowed', opacity: txHash ? 1 : 0.5 }}
          >
            <span style={{ fontSize: '10px', color: activeTab === 4 ? '#6fd3ee' : '#456b54', fontWeight: 'bold', letterSpacing: '0.1em', display: 'flex', alignItems: 'center' }}>
              <span style={{ border: `1px solid ${activeTab === 4 ? '#6fd3ee' : '#456b54'}`, padding: '2px 6px', marginRight: '8px', borderRadius: '2px' }}>4</span> STATUS
            </span>
          </div>
        </div>

        {activeTab === 1 && (
          <div style={{ padding: '32px', display: 'flex', flexDirection: 'column', width: '100%' }}>
            <h3 style={{ color: '#6fd3ee', fontSize: '12px', fontWeight: 'bold', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '16px' }}>Bridge Direction</h3>
            
            <div style={{ display: 'flex', position: 'relative', width: '100%' }}>
              <div onClick={() => setIsChainDropdownOpen(!isChainDropdownOpen)} style={{ flex: 1, backgroundColor: '#183526', border: '1px solid #6fd3ee', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '140px', cursor: 'pointer', position: 'relative' }}>
                <div style={{ width: '36px', height: '36px', borderRadius: '50%', backgroundColor: '#213a2d', border: `1px solid ${selectedChain.color}`, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '12px' }}>
                  {renderChainIcon(selectedChain.type, selectedChain.color)}
                </div>
                <span style={{ color: 'white', fontWeight: '600', fontSize: '14px', marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '6px' }}>{selectedChain.name} <ChevronDown size={14} color="#6fd3ee" /></span>
                <span style={{ color: '#5b7d68', fontSize: '10px', fontWeight: 'bold', letterSpacing: '0.1em', textTransform: 'uppercase' }}>Source</span>

                {isChainDropdownOpen && (
                  <div style={{ position: 'absolute', top: '100%', left: '-1px', right: '-1px', backgroundColor: '#183526', border: '1px solid #6fd3ee', zIndex: 50 }}>
                    {SUPPORTED_CHAINS.map((chain) => (
                      <div 
                        key={chain.name}
                        onClick={() => { setSelectedChain(chain); connectWallet(); }}
                        style={{ padding: '12px', display: 'flex', alignItems: 'center', gap: '12px', borderBottom: '1px solid #1c3e2a', transition: 'background 0.2s' }}
                        onMouseOver={(e) => e.currentTarget.style.backgroundColor = '#1c3e2a'}
                        onMouseOut={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                      >
                         <div style={{ width: '20px', height: '20px' }}>{renderChainIcon(chain.type, chain.color)}</div>
                         <span style={{ fontSize: '12px', fontWeight: '600', color: chain.nftContract ? 'white' : '#5b7d68' }}>{chain.name} {chain.nftContract ? '' : '(Soon)'}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div style={{ flex: 1, backgroundColor: '#132a1d', border: '1px solid #1c3e2a', borderLeft: 'none', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '140px' }}>
                <div style={{ width: '36px', height: '36px', borderRadius: '50%', backgroundColor: '#193922', border: '1px solid #37b258', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '12px' }}>
                   <span style={{ color: '#37b258', fontWeight: '900', fontSize: '16px', fontFamily: 'serif' }}>R</span>
                </div>
                <span style={{ color: 'white', fontWeight: '600', fontSize: '14px', marginBottom: '4px' }}>Robinhood L2</span>
                <span style={{ color: '#5b7d68', fontSize: '10px', fontWeight: 'bold', letterSpacing: '0.1em', textTransform: 'uppercase' }}>Destination</span>
              </div>

              <div style={{ position: 'absolute', left: '50%', top: '50%', transform: 'translate(-50%, -50%)', width: '32px', height: '32px', borderRadius: '50%', backgroundColor: '#132a1d', border: '1px solid #1c3e2a', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 10 }}>
                <ArrowRightLeft size={16} color="#6fd3ee" />
              </div>
            </div>

            <div style={{ display: 'flex', gap: '16px', marginTop: '32px', marginBottom: '16px', flexWrap: 'wrap' }}>
               <div style={{ flex: '1 1 40%', minWidth: '220px', position: 'relative' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                    <h3 style={{ color: '#6fd3ee', fontSize: '12px', fontWeight: 'bold', letterSpacing: '0.1em', textTransform: 'uppercase', margin: 0 }}>Select Asset</h3>
                    <button onClick={handleMint} disabled={isMinting || !selectedChain.nftContract} style={{ background: 'transparent', border: 'none', color: '#6fd3ee', fontSize: '9px', fontWeight: 'bold', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <Hammer size={10} /> {isMinting ? "MINTING..." : "MINT TEST NFT"}
                    </button>
                  </div>
                  
                  <div 
                    onClick={() => { if (!account) return alert("Connectez d'abord votre wallet !"); setIsNftDropdownOpen(!isNftDropdownOpen); }}
                    style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', backgroundColor: '#173324', border: '1px solid #1c3e2a', padding: '10px 14px', cursor: account ? 'pointer' : 'not-allowed', opacity: account ? 1 : 0.5, height: '48px' }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      {selectedNft ? (
                        <>
                          {selectedNft.image ? ( <img src={selectedNft.image} alt={selectedNft.name} style={{ width: '26px', height: '26px', borderRadius: '4px', border: '1px solid #5b7d68', objectFit: 'cover' }} /> ) : (
                            <div style={{ width: '26px', height: '26px', borderRadius: '4px', backgroundColor: '#213a2d', border: '1px solid #5b7d68', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><ImageIcon size={14} color="#5b7d68" /></div>
                          )}
                          <span style={{ color: 'white', fontWeight: '600', fontSize: '13px' }}>{selectedNft.name}</span>
                        </>
                      ) : (
                        <><ImageIcon size={18} color="#5b7d68" /><span style={{ color: '#5b7d68', fontSize: '13px', fontWeight: '500' }}>{account ? "Select a NFT to bridge..." : "Wallet not connected"}</span></>
                      )}
                    </div>
                    <ChevronDown size={16} color="#5b7d68" />
                  </div>

                  {isNftDropdownOpen && account && (
                    <div className="nft-scroll" style={{ position: 'absolute', top: '100%', left: '0', right: '0', backgroundColor: '#183526', border: '1px solid #6fd3ee', borderTop: 'none', zIndex: 50, maxHeight: '240px', overflowY: 'auto' }}>
                      {isLoadingNFTs ? (
                        <div style={{ padding: '24px', display: 'flex', justifyContent: 'center', alignItems: 'center', color: '#6fd3ee' }}><Loader2 size={18} className="animate-spin" style={{ marginRight: '8px' }} /> <span style={{ fontSize: '12px', fontWeight: '600' }}>Scanning wallet...</span></div>
                      ) : ownedNFTs.length > 0 ? (
                        ownedNFTs.map((nft) => (
                          <div key={nft.id} onClick={() => { setSelectedNft(nft); setTokenId(nft.id); setIsNftDropdownOpen(false); }} style={{ padding: '12px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid #1c3e2a', cursor: 'pointer', transition: 'background 0.2s' }} onMouseOver={(e) => e.currentTarget.style.backgroundColor = '#1c3e2a'} onMouseOut={(e) => e.currentTarget.style.backgroundColor = 'transparent'}>
                             <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                               {nft.image ? ( <img src={nft.image} alt={nft.name} style={{ width: '36px', height: '36px', borderRadius: '4px', border: '1px solid #5b7d68', objectFit: 'cover' }} /> ) : (
                                 <div style={{ width: '36px', height: '36px', borderRadius: '4px', backgroundColor: '#213a2d', border: '1px solid #5b7d68', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><ImageIcon size={16} color="#5b7d68" /></div>
                               )}
                               <span style={{ fontSize: '13px', fontWeight: '600', color: 'white' }}>{nft.name}</span>
                             </div>
                             <span style={{ fontSize: '10px', color: '#6fd3ee', fontFamily: 'monospace', fontWeight: 'bold' }}>ID: #{nft.id}</span>
                          </div>
                        ))
                      ) : (
                        <div style={{ padding: '24px', textAlign: 'center', color: '#5b7d68', fontSize: '12px', fontWeight: '500' }}>Aucun NFT trouvé.</div>
                      )}
                    </div>
                  )}
               </div>

               <div style={{ flex: '1 1 55%', minWidth: '220px' }}>
                  <h3 style={{ color: '#6fd3ee', fontSize: '12px', fontWeight: 'bold', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '16px' }}>Destination Address</h3>
                  <div style={{ display: 'flex', alignItems: 'center', width: '100%', backgroundColor: '#173324', border: '1px solid #1c3e2a', padding: '10px 14px', height: '48px' }}>
                    <Wallet size={18} color="#5b7d68" style={{ marginRight: '12px' }} />
                    <input type="text" placeholder="0x..." value={account || ""} readOnly style={{ flex: 1, backgroundColor: 'transparent', border: 'none', outline: 'none', color: 'white', fontFamily: 'monospace', fontSize: '14px', width: '100%' }} />
                  </div>
               </div>
            </div>

            <button onClick={handleBridge} disabled={btnState.disabled} style={{ width: '100%', marginTop: '32px', padding: '16px', backgroundColor: btnState.disabled ? '#5b7d68' : '#6fd3ee', color: '#11261a', fontWeight: 'bold', fontSize: '14px', letterSpacing: '0.1em', textTransform: 'uppercase', border: 'none', cursor: btnState.disabled ? 'not-allowed' : 'pointer', transition: 'background-color 0.2s' }}>
              {btnState.text}
            </button>
          </div>
        )}

        {activeTab === 4 && (
          <div style={{ padding: '40px 32px', display: 'flex', flexDirection: 'column', width: '100%', minHeight: '380px' }}>
            
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '40px' }}>
              <h3 style={{ color: '#6fd3ee', fontSize: '14px', fontWeight: 'bold', letterSpacing: '0.1em', textTransform: 'uppercase', margin: 0 }}>
                Bridge Tracker
              </h3>
              {txHash && (
                <a href={`https://sepolia.etherscan.io/tx/${txHash}`} target="_blank" rel="noreferrer" style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#5b7d68', fontSize: '11px', textDecoration: 'none', borderBottom: '1px solid #5b7d68', paddingBottom: '2px' }}>
                  View on Etherscan <ExternalLink size={12} />
                </a>
              )}
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '32px', position: 'relative' }}>
              <div style={{ position: 'absolute', left: '16px', top: '16px', bottom: '16px', width: '2px', backgroundColor: '#1c3e2a', zIndex: 0 }}></div>

              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '20px', zIndex: 10 }}>
                <div style={{ width: '34px', height: '34px', borderRadius: '50%', backgroundColor: crossChainProgress >= 1 ? '#183526' : '#132a1d', border: `2px solid ${crossChainProgress >= 1 ? '#37b258' : '#1c3e2a'}`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  {crossChainProgress >= 1 ? <CheckCircle2 size={18} color="#37b258" /> : <Clock size={16} color="#5b7d68" />}
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', marginTop: '6px' }}>
                  <span style={{ color: crossChainProgress >= 1 ? 'white' : '#5b7d68', fontSize: '14px', fontWeight: '600' }}>1. Validated on {selectedChain.name}</span>
                  <span style={{ color: '#5b7d68', fontSize: '11px', marginTop: '4px' }}>Assets are successfully locked in the bridge contract.</span>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '20px', zIndex: 10 }}>
                <div className={crossChainProgress === 1 ? "status-pulse" : ""} style={{ width: '34px', height: '34px', borderRadius: '50%', backgroundColor: crossChainProgress >= 2 ? '#183526' : '#132a1d', border: `2px solid ${crossChainProgress >= 2 ? '#37b258' : (crossChainProgress === 1 ? '#6fd3ee' : '#1c3e2a')}`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  {crossChainProgress >= 2 ? <CheckCircle2 size={18} color="#37b258" /> : (crossChainProgress === 1 ? <Loader2 size={16} color="#6fd3ee" className="animate-spin" /> : <Clock size={16} color="#5b7d68" />)}
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', marginTop: '6px' }}>
                  <span style={{ color: crossChainProgress >= 2 ? 'white' : (crossChainProgress === 1 ? '#6fd3ee' : '#5b7d68'), fontSize: '14px', fontWeight: '600' }}>2. Cross-Chain Relaying</span>
                  <span style={{ color: '#5b7d68', fontSize: '11px', marginTop: '4px' }}>Proof of deposit is being transmitted to the destination network.</span>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '20px', zIndex: 10 }}>
                <div className={crossChainProgress === 2 ? "status-pulse" : ""} style={{ width: '34px', height: '34px', borderRadius: '50%', backgroundColor: crossChainProgress >= 3 ? '#183526' : '#132a1d', border: `2px solid ${crossChainProgress >= 3 ? '#37b258' : (crossChainProgress === 2 ? '#6fd3ee' : '#1c3e2a')}`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  {crossChainProgress >= 3 ? <CheckCircle2 size={18} color="#37b258" /> : (crossChainProgress === 2 ? <Loader2 size={16} color="#6fd3ee" className="animate-spin" /> : <Clock size={16} color="#5b7d68" />)}
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', marginTop: '6px' }}>
                  <span style={{ color: crossChainProgress >= 3 ? '#37b258' : (crossChainProgress === 2 ? '#6fd3ee' : '#5b7d68'), fontSize: '14px', fontWeight: '600' }}>3. Delivered to Robinhood L2</span>
                  <span style={{ color: '#5b7d68', fontSize: '11px', marginTop: '4px' }}>Wrapped NFT has been minted to your address.</span>
                </div>
              </div>
            </div>
            
            {crossChainProgress === 3 && (
               <div style={{ marginTop: 'auto', padding: '16px', backgroundColor: '#183526', border: '1px dashed #37b258', borderRadius: '4px', textAlign: 'center' }}>
                 <span style={{ color: '#37b258', fontSize: '12px', fontWeight: 'bold', letterSpacing: '0.1em', textTransform: 'uppercase' }}>BRIDGE COMPLETE 🎉</span>
               </div>
            )}

          </div>
        )}

        <div style={{ paddingBottom: '32px', paddingTop: activeTab === 4 ? '0' : '0', display: 'flex', alignItems: 'center', justifyContent: 'center', width: '100%' }}>
          <Lock size={12} color="#5b7d68" style={{ marginRight: '6px' }} />
          <span style={{ color: '#5b7d68', fontSize: '10px', fontWeight: 'bold', letterSpacing: '0.1em', textTransform: 'uppercase' }}>
            BUILT BY S9GCORP
          </span>
        </div>

      </div>
    </div>
  );
}