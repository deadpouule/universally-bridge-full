// src/components/NetworkSelector.tsx
import React from "react";
import { switchWalletNetwork } from "../utils/network"; 

// 1. Un tableau strict pour figer l'ordre d'affichage une fois pour toutes
const NETWORK_LIST = [
  { name: "Ethereum", id: 1 },
  { name: "Base", id: 8453 },
  { name: "Berachain", id: 80094 },
  { name: "Monad", id: 143 },
  { name: "MegaETH", id: 4326 },
  { name: "Robinhood", id: 4663 }
];

interface NetworkSelectorProps {
  currentChainId?: number;
  onNetworkChange: (chainId: number) => void;
}

export default function NetworkSelector({ currentChainId, onNetworkChange }: NetworkSelectorProps) {
  
  const handleSelectChange = async (event: React.ChangeEvent<HTMLSelectElement>) => {
    const selectedId = Number(event.target.value);
    if (!selectedId) return;

    try {
      // On passe DIRECTEMENT l'ID numérique sans intermédiaire ni index instable
      await switchWalletNetwork(selectedId);
      onNetworkChange(selectedId);
    } catch (error) {
      console.error("Échec de la bascule de réseau :", error);
    }
  };

  // On retrouve le nom correspondant à l'ID actuel pour l'affichage de l'état
  const currentNetwork = NETWORK_LIST.find(net => net.id === currentChainId);

  return (
    <div className="relative">
      <select 
        value={currentChainId || ""}
        onChange={handleSelectChange}
        className="bg-black text-white border border-gray-700 rounded-md px-4 py-2 uppercase font-bold tracking-wider focus:border-red-600 outline-none"
      >
        <option value="" disabled>Sélectionner la source</option>
        {NETWORK_LIST.map((network) => (
          <option key={network.id} value={network.id}>
            {network.name}
          </option>
        ))}
      </select>
    </div>
  );
}