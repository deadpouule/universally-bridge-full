import { expect } from "chai";
import hre from "hardhat";
const ethers = (hre as any).ethers;
import { Signer } from "ethers";

describe("Arbitrum Native NFT Bridge Integration", function () {
  let owner: Signer, user1: Signer;
  let ownerAddress: string, user1Address: string;
  let mockNFT: any, wrappedNFT: any, hubBridge: any, spokeBridge: any;

  beforeEach(async function () {
    [owner, user1] = await ethers.getSigners();
    ownerAddress = await owner.getAddress();
    user1Address = await user1.getAddress();

    const MockNFTFactory = await ethers.getContractFactory("MockNFT");
    mockNFT = await MockNFTFactory.deploy();

    const SpokeBridgeFactory = await ethers.getContractFactory("SpokeBridgeL1");
    spokeBridge = await SpokeBridgeFactory.deploy(ownerAddress);

    const HubBridgeFactory = await ethers.getContractFactory("HubBridge");
    hubBridge = await HubBridgeFactory.deploy(await spokeBridge.getAddress(), ownerAddress);

    const WrappedNFTFactory = await ethers.getContractFactory("WrappedNFT");
    // 🛠️ LA CORRECTION EST ICI : On remet les 3 arguments (Nom, Symbole, Adresse)
    wrappedNFT = await WrappedNFTFactory.deploy("Wrapped NFT", "WNFT", await hubBridge.getAddress());

    await hubBridge.setWrappedNFT(await mockNFT.getAddress(), await wrappedNFT.getAddress());
    await spokeBridge.setL2HubBridge(await hubBridge.getAddress());

    await mockNFT.mint(user1Address);
  });

  describe("1. Sécurité et Mappings", function () {
    it("Devrait configurer le HubBridge comme seul minter autorisé du WrappedNFT", async function () {
      expect(await wrappedNFT.bridgeHub()).to.equal(await hubBridge.getAddress());
    });

    it("Devrait lier correctement le NFT original à sa version Wrapped dans le Hub", async function () {
      expect(await hubBridge.wrappedNFTs(await mockNFT.getAddress())).to.equal(await wrappedNFT.getAddress());
    });
  });

  describe("2. Flux Cross-Chain L1 -> L2", function () {
    
    it("SpokeBridgeL1 : Devrait verrouiller le NFT dans le bridge source", async function () {
      const tokenId = 1;

      await mockNFT.connect(user1).approve(await spokeBridge.getAddress(), tokenId);

      await mockNFT.connect(user1).transferFrom(user1Address, await spokeBridge.getAddress(), tokenId);
      expect(await mockNFT.ownerOf(tokenId)).to.equal(await spokeBridge.getAddress());
    });

    it("HubBridge : processMessage devrait minter le WrappedNFT sur le L2", async function () {
      const tokenId = 1;

      // FIX : On force le typage "any" sur expect pour éviter l'erreur avec "emit"
      await (expect(
        hubBridge.processMessage(user1Address, await mockNFT.getAddress(), tokenId)
      ) as any)
        .to.emit(hubBridge, "NFTReceived")
        .withArgs(user1Address, await mockNFT.getAddress(), await wrappedNFT.getAddress(), tokenId);

      expect(await wrappedNFT.ownerOf(tokenId)).to.equal(user1Address);
    });
  });
});