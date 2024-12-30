import './App.css'

import { ethers } from 'ethers'
import React, { useCallback, useEffect, useState } from 'react'

// 导入 ABI
import MarketABI from './abis/Market.json'
import MyNFTABI from './abis/MyNFT.json'

//  合约地址
const MYNFT_ADDRESS = "0x28bf13339C68a6027E30B47717A85AaFE195c02c";
const MARKET_ADDRESS = "0xB4e91280B3eFAe17AF1887793D0586C503f7e420";

function App() {
  const [account, setAccount] = useState(null);
  // const [provider, setProvider] = useState(null);
  const [nftContract, setNftContract] = useState(null);
  const [marketContract, setMarketContract] = useState(null);
  const [tokenId, setTokenId] = useState('');
  const [tokenCID, setTokenCID] = useState('');
  const [price, setPrice] = useState('');
  const [nftsForSale, setNftsForSale] = useState([]);
  const [userNFTs, setUserNFTs] = useState([]);
  const [loading, setLoading] = useState(false);

  // 连接到 MetaMask
  const connectWallet = async () => {
    if (window.ethereum) {
      await window.ethereum.request({ method: 'eth_requestAccounts' });
      const newProvider = new ethers.providers.Web3Provider(window.ethereum);
      const newSigner = newProvider.getSigner();
      const newAccount = await newSigner.getAddress();
      setAccount(newAccount);
      // setProvider(newProvider);

      const nftContractInstance = new ethers.Contract(MYNFT_ADDRESS, MyNFTABI.abi, newSigner);
      setNftContract(nftContractInstance);

      const marketContractInstance = new ethers.Contract(MARKET_ADDRESS, MarketABI.abi, newSigner);
      setMarketContract(marketContractInstance);
    } else {
      alert('Please install MetaMask!');
    }
  };

  // 铸造 NFT
  const mintNFT = async () => {
    if (!nftContract || !tokenCID) return;

    setLoading(true);
    try {
      const transaction = await nftContract.safeMint(account, tokenCID);
      await transaction.wait();
      alert('NFT Minted Successfully!');
    } catch (err) {
      console.error(err);
      alert('Error minting NFT');
    } finally {
      setLoading(false);
    }
  };

  // 列出 NFT 出售
  const listNFTForSale = async () => {
    if (!marketContract || !tokenId || !price) return;

    setLoading(true);
    try {
      const transaction = await marketContract.listNFTForSale(tokenId, ethers.utils.parseEther(price));
      await transaction.wait();
      alert('NFT listed for sale!');
    } catch (err) {
      console.error(err);
      alert('Error listing NFT for sale');
    } finally {
      setLoading(false);
    }
  }


  const delistNFT = async (id) => {
    if (!marketContract) return;

    setLoading(true);
    try {
      const transaction = await marketContract.delistNFT(id);
      await transaction.wait();
      alert('NFT delisted from sale');
    } catch (err) {
      console.error(err);
      alert('Error delisting NFT');
    } finally {
      setLoading(false);
    }
  };

  // 购买 NFT
  const buyNFT = async (tokenId, price) => {
    if (!account || !marketContract || !nftContract) return;
  
    try {
      setLoading(true);
  
      const priceInWei = ethers.utils.parseEther(price); // 将 ETH 转为 Wei（以太坊最小单位）
  
      // 调用合约购买 NFT
      const tx = await marketContract.buyNFT(tokenId, { value: priceInWei });
  
      // 等待交易完成
      await tx.wait();
      
      alert('NFT purchased successfully!');
      fetchNftsForSale(); 
    } catch (err) {
      console.error(err);
      alert('Error buying NFT');
    } finally {
      setLoading(false);
    }
  }; 

  const fetchNftsForSale = useCallback(async () => {
    if (!marketContract || !nftContract) return;
  
    try {
      const totalSupply = await nftContract.totalSupply();
      const nfts = [];
      for (let i = 0; i < totalSupply.toNumber(); i++) { 
        const tokenId = await nftContract.tokenByIndex(i);
        const priceBigNumber = await marketContract.getPrice(tokenId);
       const price = ethers.utils.formatEther(priceBigNumber).toString(); 
        console.log('price formatted as ETH:', price);
  
        const isForSale = await marketContract.isForSale(tokenId);
        console.log('isForSale:', isForSale);
  
        if (isForSale) {
          nfts.push({
            tokenId: tokenId.toString(),
            price: price, 
          });
        }
      }
  
      setNftsForSale(nfts);
    } catch (err) {
      console.error(err);
      alert('Error fetching NFTs for sale');
    }
  }, [marketContract, nftContract]);
  
  const fetchMetadata = async (uri) => {
    // 使用 fetch 来获取元数据
    try {
      const response = await fetch(uri);
      const data = await response.json();
      return data;
    } catch (err) {
      console.error('Error fetching metadata:', err);
      return null;
    }
  };
  
  // 获取用户的所有 NFT
  const fetchUserNFTs = useCallback(async () => {
    console.log('nftContract:', nftContract);
    console.log('account:', account);
  
    if (!nftContract || !account) return;
  
    try {
      const totalSupply = await nftContract.totalSupply();
      console.log('totalSupply',totalSupply.toString());
      const userNFTs = [];
      for (let i = 0; i < totalSupply.toNumber(); i++) {
        const tokenId = await nftContract.tokenByIndex(i);
        const owner = await nftContract.ownerOf(tokenId);
        const tokenURI = await nftContract.tokenURI(tokenId);  // 获取tokenURI
        console.log(tokenURI);
        const metadata = await fetchMetadata(tokenURI);  // 获取元数据
        console.log(metadata);
        console.log('owner of tokenId', tokenId.toString(), 'is', owner.toString());
        console.log(metadata.name);
        if (owner === account) {
          userNFTs.push({tokenId,metadata});
        }
      }
        setUserNFTs(userNFTs);
    } catch (err) {
      console.error(err);
      alert('Error fetching user NFTs');
    }
  }, [nftContract, account]);

  // 页面加载时获取市场上的 NFT
  useEffect(() => {
    if (marketContract) {
      fetchNftsForSale();
    }
  }, [marketContract, nftContract, fetchNftsForSale]);

  // 页面加载时获取用户的 NFT
  useEffect(() => {
    if (nftContract && account) {
      fetchUserNFTs();
    }
  }, [nftContract, account, fetchUserNFTs]);  

  return (
    <div className="App">
      <h1>NFT交易平台</h1>
      {!account ? (
        <button onClick={connectWallet}>连接钱包</button>
      ) : (
        <div>
          <p>钱包链接为 {account}</p>
          <h2>铸造一个NFT</h2>
          <input
            type="text"
            placeholder="输入 CID"
            value={tokenCID}
            onChange={(e) => setTokenCID(e.target.value)}
          />
          <button onClick={mintNFT} disabled={loading}>
            {loading ? '铸造中...' : '铸造 NFT'}
          </button>

          <h2>出售NFT</h2>
          <input
            type="number"
            placeholder="输入 ID"
            value={tokenId}
            onChange={(e) => setTokenId(e.target.value)}
          />
          <input
            type="text"
            placeholder="输入售价 (ETH)"
            value={price}
            onChange={(e) => setPrice(e.target.value)}
          />
          <button onClick={listNFTForSale} disabled={loading}>
            {loading ? '出售中...' : '出售 NFT'}
          </button>

          <h2>你的NFT</h2>
          {userNFTs.length === 0 ? (
            <p>你还没有自己的NFT</p>
          ) : (
              <div className="nft-gallery">
              {userNFTs.map(({ tokenId, metadata }) => (
                <div className="listBox" key={tokenId.toString()}>
                  <div className="listImg">
                    <img src={metadata.image} alt={metadata.name} />
                  </div>
                  <div className="listTitle">
                    <h3>{metadata.name}</h3>
                  </div>
                  <div className="listRemark">
                    <p>{metadata.description}</p>
                  </div>
                  <div className="listBtnBox">
                    <button
                        onClick={() => delistNFT(tokenId)}
                        disabled={loading}
                        className="btn1"
                      >
                        {loading ? '移除中...' : '移除'}
                    </button>
                  </div>  
                </div>
              ))}
            </div>
          )}

          <h2>正在出售的NFT</h2>
          {nftsForSale.length === 0 ? (
            <p>无NFT出售中</p>
          ) : (
            <ul>
              {nftsForSale.map(({ tokenId, price }) => (
                <li key={tokenId.toString()}>
                  Token ID: {tokenId.toString()}, Price: {price.toString()} ETH
                  <button onClick={() => buyNFT(tokenId, price)} disabled={loading}>
                    {loading ? '购买中...' : '购买 NFT'}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}

export default App;
