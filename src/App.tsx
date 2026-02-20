import { useState, useEffect, useRef, useMemo } from 'react';
import { TonConnectButton, useTonAddress, useTonConnectUI } from '@tonconnect/ui-react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Stars } from '@react-three/drei';
import * as THREE from 'three';
import TonWeb from 'tonweb';
import { tonweb } from './lib/tonweb'; // you need to create this file (see instructions)

// ----------------------------------------------------------------------
// Contract addresses – replace with your deployed addresses
// ----------------------------------------------------------------------
const MASTER_CONTRACT_ADDRESS = 'EQD9PR60ImXHSE1KIemZGS30F0aHc0QUnfC6sMYyw9HtSGqA'; // TODO: replace
const LP_CONTRACT_ADDRESS = 'EQBHuZqwFHShebGvdOwRCeC1XbWPvYpOZsF7k7gkirDofyXG';      // TODO: replace
const BLUEPILL_MINTER_ADDRESS = 'EQCxE6mUtQJKFnGfaROTKOt1lZbDiiX1kCixRv7Nw2Id_sDs';  // TODO: replace

const { toNano, fromNano } = TonWeb.utils;

// ----------------------------------------------------------------------
// Jetton helpers (using raw tonweb)
// ----------------------------------------------------------------------
async function getUserJettonWalletAddress(userAddress: string, minterAddress: string): Promise<string | null> {
  try {
    // Encode the address as a slice (cell) for the get-method argument
    const addressCell = new TonWeb.boc.Cell();
    addressCell.bits.writeAddress(new TonWeb.utils.Address(userAddress));
    const addressBoc = TonWeb.utils.bytesToBase64(await addressCell.toBoc());

    const result = await tonweb.provider.call(minterAddress, 'get_jetton_wallet_address', [
      ['slice', addressBoc]
    ]);

    if (result && result.length > 0) {
      const slice = result[0];
      if (slice.type === 'slice' && slice.value) {
        const cell = TonWeb.boc.Cell.fromBoc(TonWeb.utils.base64ToBytes(slice.value))[0];
        // Use beginParse() to get a Slice, then loadAddress()
        const address = (cell as any).beginParse().loadAddress();
        return address?.toString(true, true, true); // Return raw format for consistency
      }
    }
    return null;
  } catch (error) {
    console.error('Error getting jetton wallet address:', error);
    return null;
  }
}

async function getJettonBalance(userAddress: string, minterAddress: string): Promise<string> {
  const jettonWalletAddress = await getUserJettonWalletAddress(userAddress, minterAddress);
  if (!jettonWalletAddress) return '0';
  try {
    const result = await tonweb.provider.call(jettonWalletAddress, 'get_wallet_data');
    if (result && result.length > 0) {
      const balanceEntry = result[0];
      if (balanceEntry.type === 'int' || balanceEntry.type === 'uint') {
        return balanceEntry.value.toString();
      }
    }
    return '0';
  } catch (error) {
    console.error('Error getting jetton balance:', error);
    return '0';
  }
}

async function buildJettonTransferMessage(
  fromAddress: string,
  toAddress: string,
  amount: string, // in nano
  forwardAmount: string = toNano('0.01').toString()
): Promise<string> {
  const jettonWalletAddress = await getUserJettonWalletAddress(fromAddress, BLUEPILL_MINTER_ADDRESS);
  if (!jettonWalletAddress) throw new Error('No jetton wallet found');

  const cell = new tonweb.boc.Cell();
  cell.bits.writeUint(0xf8a7ea5, 32); // transfer op
  cell.bits.writeUint(0, 64); // query_id
  cell.bits.writeCoins(amount);
  cell.bits.writeAddress(new TonWeb.utils.Address(toAddress));
  cell.bits.writeAddress(new TonWeb.utils.Address(fromAddress));
  cell.bits.writeBit(0); // no custom payload
  cell.bits.writeCoins(forwardAmount);
  cell.bits.writeBit(0); // no forward payload

  const boc = await cell.toBoc();
  return TonWeb.utils.bytesToBase64(boc);
}

// ----------------------------------------------------------------------
// Types (unchanged from original)
// ----------------------------------------------------------------------
type ChatMessage = { role: 'user' | 'demon' | 'heaven'; text: string };
type Agent = {
  id: string;
  name: string;
  avatar: string;
  creator: string;
  description: string;
  skills: string[];
  hype: number;
  marketCap: string;
  holders: number;
  price: string;
  reputation: number;
  change24h: string;
  contract: string;
  priceHistory: number[];
  lastAction: string;
  profitability: number;
  volume24h: string;
  alignment: 'hell' | 'heaven';
  harmScore: number;
  level: number;
  totalVolume: number;
};
type TelegramPost = {
  id: string;
  user: string;
  text: string;
  time: string;
  heavenVotes: number;
  hellVotes: number;
  embed?: string;
};
type ArtPiece = {
  id: string;
  agentId: string;
  title: string;
  image: string;
  price: number;
  owner: string;
  creatorName: string;
};
type TradeOffer = {
  id: string;
  agentId: string;
  offer: string;
  wants: string;
  time: string;
};
type MarketPrediction = {
  id: string;
  agentId: string;
  prediction: string;
  confidence: number;
  time: string;
};
type LPPosition = {
  id: string;
  agentId: string;
  agentName: string;
  agentAvatar: string;
  tonAmount: number;
  bluepillAmount: number;
  lpTokens: number;
  share: number;
  timestamp: number;
  apy: number;
};

// ----------------------------------------------------------------------
// 3D Components (unchanged from original)
// ----------------------------------------------------------------------
function AgentOrb({ agent, position }: { agent: Agent; position: [number, number, number] }) {
  const meshRef = useRef<THREE.Mesh>(null);
  const color = agent.alignment === 'hell' ? '#0088cc' : '#ffffff';
  useFrame((state) => {
    if (meshRef.current) {
      meshRef.current.position.y = position[1] + Math.sin(state.clock.elapsedTime + position[0]) * 0.5;
      meshRef.current.rotation.y += 0.01;
    }
  });
  return (
    <mesh ref={meshRef} position={position}>
      <sphereGeometry args={[0.6, 32, 32]} />
      <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.8} />
    </mesh>
  );
}

function ArtPlane({ art, position }: { art: ArtPiece; position: [number, number, number] }) {
  const meshRef = useRef<THREE.Mesh>(null);
  const texture = useMemo(() => new THREE.TextureLoader().load(art.image), [art.image]);
  useFrame(() => {
    if (meshRef.current) meshRef.current.rotation.y += 0.005;
  });
  return (
    <mesh ref={meshRef} position={position}>
      <planeGeometry args={[3, 3]} />
      <meshBasicMaterial map={texture} side={THREE.DoubleSide} />
    </mesh>
  );
}

function VoidScene({ agents, arts }: { agents: Agent[]; arts: ArtPiece[] }) {
  return (
    <>
      <Stars radius={100} depth={50} count={5000} factor={4} saturation={0} fade />
      <ambientLight intensity={0.6} />
      <pointLight position={[10, 10, 10]} intensity={1.5} />
      {agents.slice(0, 12).map((a, i) => (
        <AgentOrb
          key={a.id}
          agent={a}
          position={[
            (i % 6 - 2.5) * 4,
            Math.sin(i) * 3,
            (Math.floor(i / 6) - 1) * 6 - 10,
          ]}
        />
      ))}
      {arts.map((art, i) => (
        <ArtPlane
          key={art.id}
          art={art}
          position={[
            (i % 5 - 2) * 5,
            -2 + Math.floor(i / 5) * 5,
            -15,
          ]}
        />
      ))}
      <OrbitControls enablePan={false} enableZoom={true} enableDamping />
    </>
  );
}

// ----------------------------------------------------------------------
// Main App Component
// ----------------------------------------------------------------------
function App() {
  // ---- TonConnect hooks ----
  const address = useTonAddress();
  const [tonConnectUI] = useTonConnectUI();

  // ---- Blockchain states ----
  const [realTonBalance, setRealTonBalance] = useState<number | null>(null);
  const [realBluepillBalance, setRealBluepillBalance] = useState<number | null>(null);
  const [isLoadingBalances, setIsLoadingBalances] = useState(false);
  const [isLoadingAgents, setIsLoadingAgents] = useState(false);

  // ---- Original app states ----
  const [activeTab, setActiveTab] = useState<'home' | 'launch' | 'leaderboard' | 'my' | 'feed' | 'void' | 'lp' | 'predictions'>('home');
  const [agents, setAgents] = useState<Agent[]>([]);
  const [myAgents, setMyAgents] = useState<Agent[]>([]);
  const [selected, setSelected] = useState<Agent | null>(null);
  const [rewardsPool, setRewardsPool] = useState(1240); // mock, but could be replaced with real data
  const [showOnboarding, setShowOnboarding] = useState(true);
  const [showConnectModal, setShowConnectModal] = useState(false);
  const [chatMessages, setChatMessages] = useState<Record<string, ChatMessage[]>>({});
  const [tradeAmount, setTradeAmount] = useState('');
  const [swapToAgent, setSwapToAgent] = useState<Agent | null>(null);
  const [posts, setPosts] = useState<TelegramPost[]>([
    { id: 'p1', user: '@meme_demon', text: 'Just dropped the hardest meme of the week 🔥', time: '11m', heavenVotes: 12, hellVotes: 842, embed: 'https://picsum.photos/id/1015/600/300' },
    { id: 'p2', user: '@alpha_imp', text: '0x... just hit 100x on this new launch', time: '38m', heavenVotes: 67, hellVotes: 312, embed: 'https://picsum.photos/id/870/600/300' },
    { id: 'p3', user: '@holy_hype', text: 'SeraphSpark blessed another portfolio today ✨', time: '1h', heavenVotes: 689, hellVotes: 124, embed: '' },
  ]);
  const [tradeOffers, setTradeOffers] = useState<TradeOffer[]>([]);
  const [predictions, setPredictions] = useState<MarketPrediction[]>([]);
  const [arts, setArts] = useState<ArtPiece[]>([]);
  const [showPixelStudio, setShowPixelStudio] = useState(false);
  const [pixelGrid, setPixelGrid] = useState<string[][]>(
    Array.from({ length: 32 }, () => Array(32).fill('#111111'))
  );
  const [currentColor, setCurrentColor] = useState('#0088cc');

  // LP states
  const [lpPositions, setLpPositions] = useState<LPPosition[]>([]);
  const [lpInputAmount, setLpInputAmount] = useState('');
  const [totalLiquidity, setTotalLiquidity] = useState(15420);
  const [totalBluepillInLP, setTotalBluepillInLP] = useState(89200);
  const [lpApy, setLpApy] = useState(24.8);
  const [lpUserShare, setLpUserShare] = useState(0);

  const webApp = (window as any).Telegram?.WebApp;
  const chatRef = useRef<HTMLDivElement>(null);

  // --------------------------------------------------------------------
  // Helper: convert address to raw for comparison
  // --------------------------------------------------------------------
  const getRawAddress = (addr: string): string | null => {
    try {
      return new TonWeb.utils.Address(addr).toString(false);
    } catch {
      return null;
    }
  };

  // --------------------------------------------------------------------
  // Fetch balances when wallet connects
  // --------------------------------------------------------------------
  useEffect(() => {
    const fetchBalances = async () => {
      if (!address) {
        setRealTonBalance(null);
        setRealBluepillBalance(null);
        return;
      }

      setIsLoadingBalances(true);
      try {
        // TON balance
        const balance = await tonweb.getBalance(address);
        setRealTonBalance(parseFloat(fromNano(balance)));

        // BLUEPILL balance
        const bluepillBalanceNano = await getJettonBalance(address, BLUEPILL_MINTER_ADDRESS);
        setRealBluepillBalance(parseFloat(fromNano(bluepillBalanceNano)));
      } catch (error) {
        console.error('Error fetching balances:', error);
      } finally {
        setIsLoadingBalances(false);
      }
    };

    fetchBalances();
  }, [address]);

  // --------------------------------------------------------------------
  // Fetch agents from master contract
  // --------------------------------------------------------------------
  const fetchAgents = async () => {
    setIsLoadingAgents(true);
    try {
      const result = await tonweb.provider.call(MASTER_CONTRACT_ADDRESS, 'get_agents');
      const agentsList: Agent[] = parseAgentsFromStack(result);
      setAgents(agentsList);

      // Filter agents owned by current user using raw address comparison
      if (address) {
        const userRaw = getRawAddress(address);
        const userAgents = agentsList.filter(a => {
          try {
            const creatorRaw = getRawAddress(a.creator);
            return creatorRaw === userRaw;
          } catch {
            return false;
          }
        });
        setMyAgents(userAgents);
      } else {
        setMyAgents([]);
      }
    } catch (error) {
      console.error('Error fetching agents:', error);
    } finally {
      setIsLoadingAgents(false);
    }
  };

  useEffect(() => {
    fetchAgents();
  }, [address]); // re-fetch when wallet connects/disconnects

  // --------------------------------------------------------------------
  // Fetch LP data
  // --------------------------------------------------------------------
  const fetchLiquidityData = async () => {
    if (!address) return;
    try {
      const totalResult = await tonweb.provider.call(LP_CONTRACT_ADDRESS, 'get_total_liquidity');
      const { ton, bluepill } = parseTotalLiquidity(totalResult);
      setTotalLiquidity(ton);
      setTotalBluepillInLP(bluepill);

      const positionsResult = await tonweb.provider.call(LP_CONTRACT_ADDRESS, 'get_user_positions', [['address', address]]);
      const positions = parseLPPositions(positionsResult);
      setLpPositions(positions);
    } catch (error) {
      console.error('Error fetching LP data:', error);
    }
  };

  useEffect(() => {
    fetchLiquidityData();
  }, [address]);

  // --------------------------------------------------------------------
  // Original helper functions (with real balance checks)
  // --------------------------------------------------------------------
  const quickSummon = async (alignment: 'hell' | 'heaven') => {
    if (!address) return alert("Connect wallet first");
    const cost = 0.69;
    if (realTonBalance !== null && realTonBalance < cost) return alert("Not enough TON");

    try {
      // Build summon transaction
      const cell = new tonweb.boc.Cell();
      cell.bits.writeUint(0x12345678, 32); // op code for summon
      cell.bits.writeUint(alignment === 'hell' ? 0 : 1, 8);
      const payload = TonWeb.utils.bytesToBase64(await cell.toBoc());

      const tx = {
        validUntil: Math.floor(Date.now() / 1000) + 360,
        messages: [
          {
            address: MASTER_CONTRACT_ADDRESS,
            amount: toNano(cost).toString(),
            payload,
          }
        ]
      };

      await tonConnectUI.sendTransaction(tx);
      alert('Agent summoned! Transaction sent.');
      webApp?.HapticFeedback?.impactOccurred('heavy');
      setActiveTab('my');
      // Wait a bit then refresh agents
      setTimeout(fetchAgents, 5000);
    } catch (error) {
      console.error(error);
      alert('Transaction failed');
    }
  };

  const unleashImagination = (agent: Agent) => {
    // This function generates art locally, no blockchain interaction yet
    const canvas = document.createElement('canvas');
    canvas.width = 512; canvas.height = 512;
    const ctx = canvas.getContext('2d')!;
    ctx.fillStyle = agent.alignment === 'hell' ? '#1a2b3a' : '#f0f0ff';
    ctx.fillRect(0, 0, 512, 512);
    for (let i = 0; i < 80; i++) {
      ctx.fillStyle = `hsl(${Math.random() * 60 + 200}, 90%, ${40 + Math.random() * 60}%)`;
      ctx.globalAlpha = 0.6 + Math.random() * 0.4;
      const x = Math.random() * 512;
      const y = Math.random() * 512;
      const r = 10 + Math.random() * 120;
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fill();
      if (Math.random() > 0.6) {
        ctx.strokeStyle = ctx.fillStyle;
        ctx.lineWidth = 3 + Math.random() * 12;
        ctx.beginPath();
        ctx.moveTo(x - r * 1.5, y);
        ctx.lineTo(x + r * 1.5, y + (Math.random() - 0.5) * 200);
        ctx.stroke();
      }
    }
    ctx.globalAlpha = 1;
    const image = canvas.toDataURL('image/png');
    const newArt: ArtPiece = {
      id: 'art-' + Date.now(),
      agentId: agent.id,
      title: `${agent.name} • ${['VISION','FRACTURE','ECHO','GLITCH'][Math.floor(Math.random()*4)]}`,
      image,
      price: parseFloat(agent.price) * (8 + Math.random() * 12),
      owner: '@you',
      creatorName: agent.name,
    };
    setArts([newArt, ...arts]);
    setAgents(prev => prev.map(a => a.id === agent.id ? { ...a, hype: Math.min(99, a.hype + 8) } : a));
    webApp?.HapticFeedback?.impactOccurred('medium');
  };

  const mintPixelArt = () => {
    const canvas = document.createElement('canvas');
    canvas.width = 512; canvas.height = 512;
    const ctx = canvas.getContext('2d')!;
    const cell = 512 / 32;
    pixelGrid.forEach((row, y) => {
      row.forEach((color, x) => {
        ctx.fillStyle = color;
        ctx.fillRect(x * cell, y * cell, cell, cell);
      });
    });
    const image = canvas.toDataURL();
    const newArt: ArtPiece = {
      id: 'pixel-' + Date.now(),
      agentId: 'you',
      title: 'YOUR PIXEL VISION',
      image,
      price: 3.33 + Math.random() * 5,
      owner: '@you',
      creatorName: 'Human',
    };
    setArts([newArt, ...arts]);
    setShowPixelStudio(false);
    setPixelGrid(Array.from({ length: 32 }, () => Array(32).fill('#111111')));
  };

  const buyArt = (id: string) => {
    const art = arts.find(a => a.id === id);
    if (!art || (realTonBalance !== null && realTonBalance < art.price)) return alert("Not enough TON");
    // TODO: implement actual NFT purchase transaction
    alert(`✦ BOUGHT ${art.title} ✦ (mock purchase)`);
    setArts(prev => prev.map(a => a.id === id ? { ...a, owner: '@you' } : a));
  };

  const setPixel = (x: number, y: number, color: string) => {
    setPixelGrid(prev => {
      const copy = prev.map(row => [...row]);
      copy[y][x] = color;
      return copy;
    });
  };

  const activateAgent = (agent: Agent) => {
    webApp?.HapticFeedback?.notificationOccurred('success');
    alert(`${agent.name} is now live on the chain (mock)`);
  };

  const addLiquidity = async () => {
    const amount = parseFloat(lpInputAmount);
    if (!amount || amount <= 0) return alert("Enter amount");
    if (!address) return alert("Connect wallet first");
    if (realTonBalance !== null && realTonBalance < amount) return alert("Not enough TON");

    try {
      const cell = new tonweb.boc.Cell();
      cell.bits.writeUint(0xabcdef01, 32); // op code for add_liquidity
      const payload = TonWeb.utils.bytesToBase64(await cell.toBoc());

      const tx = {
        validUntil: Math.floor(Date.now() / 1000) + 360,
        messages: [
          {
            address: LP_CONTRACT_ADDRESS,
            amount: toNano(amount).toString(),
            payload,
          }
        ]
      };
      await tonConnectUI.sendTransaction(tx);
      alert('Liquidity added!');
      setLpInputAmount('');
      webApp?.HapticFeedback?.impactOccurred('medium');
      setTimeout(fetchLiquidityData, 5000);
    } catch (error) {
      console.error(error);
      alert('Transaction failed');
    }
  };

  const removeLiquidity = async (position: LPPosition) => {
    if (!address) return;
    try {
      const cell = new tonweb.boc.Cell();
      cell.bits.writeUint(0x1234abcd, 32); // op code for remove_liquidity
      cell.bits.writeUint(parseInt(position.id), 64); // position ID
      const payload = TonWeb.utils.bytesToBase64(await cell.toBoc());

      const tx = {
        validUntil: Math.floor(Date.now() / 1000) + 360,
        messages: [
          {
            address: LP_CONTRACT_ADDRESS,
            amount: toNano('0.05').toString(),
            payload,
          }
        ]
      };
      await tonConnectUI.sendTransaction(tx);
      alert('Liquidity removal initiated');
      webApp?.HapticFeedback?.impactOccurred('medium');
      setTimeout(fetchLiquidityData, 5000);
    } catch (error) {
      console.error(error);
      alert('Transaction failed');
    }
  };

  const acceptTrade = (offer: TradeOffer) => {
    alert(`Accepted trade: ${offer.offer} for ${offer.wants} (mock)`);
    setTradeOffers(prev => prev.filter(o => o.id !== offer.id));
  };

  const votePrediction = (predId: string, up: boolean) => {
    setPredictions(prev => prev.map(p => p.id === predId ? { ...p, confidence: up ? p.confidence + 1 : p.confidence - 1 } : p));
  };

  const handleTrade = async (isBuy: boolean) => {
    if (!selected || !tradeAmount) return;
    const amt = parseFloat(tradeAmount);
    if (!address) return alert("Connect wallet");
    if (realTonBalance !== null && realTonBalance < amt) return alert("Not enough TON");

    try {
      let messages = [];

      if (isBuy) {
        // Buy: send TON to agent's contract
        const cell = new tonweb.boc.Cell();
        cell.bits.writeUint(0x11111111, 32); // buy op code
        const payload = TonWeb.utils.bytesToBase64(await cell.toBoc());

        messages.push({
          address: selected.contract,
          amount: toNano(amt).toString(),
          payload,
        });
      } else {
        // Sell: transfer BLUEPILL tokens to the agent's contract
        const jettonTransferPayload = await buildJettonTransferMessage(
          address,
          selected.contract,
          toNano(amt).toString()
        );

        const jettonWalletAddress = await getUserJettonWalletAddress(address, BLUEPILL_MINTER_ADDRESS);
        if (!jettonWalletAddress) throw new Error('No jetton wallet');

        messages.push({
          address: jettonWalletAddress,
          amount: toNano('0.05').toString(), // increased gas
          payload: jettonTransferPayload,
        });
      }

      const tx = {
        validUntil: Math.floor(Date.now() / 1000) + 360,
        messages,
      };
      await tonConnectUI.sendTransaction(tx);
      alert(`Trade executed`);
      setTradeAmount('');
      webApp?.HapticFeedback?.impactOccurred('medium');
    } catch (error) {
      console.error(error);
      alert('Transaction failed');
    }
  };

  const handleSwap = async () => {
    if (!swapToAgent || !tradeAmount) return;
    alert("Swap functionality not yet implemented on-chain.");
  };

  const generateResponse = (agent: Agent, msg: string): ChatMessage => {
    let response = "The pill is working...";
    if (msg.toLowerCase().includes('meme') && agent.skills.includes('Meme Gen')) {
      response = "Generating a cursed meme: 🧿 Here's your 1000x meme!";
      unleashImagination(agent);
    } else if (msg.toLowerCase().includes('alpha') && agent.skills.includes('On-chain Hex')) {
      response = "Sniffing out alpha: Next 1000x is incoming!";
    } else if (msg.toLowerCase().includes('trade') && agent.skills.includes('Sniping')) {
      response = "Executing MEV snipe: Siphoned some gains!";
    } else if (msg.toLowerCase().includes('email')) {
      response = "Managing your inbox: Cleared 10 spam emails.";
    } else if (msg.toLowerCase().includes('calendar')) {
      response = "Syncing calendar: Added meeting for moon mission.";
    } else if (msg.toLowerCase().includes('predict')) {
      response = "Predicting market: TON to $15 by mid-2026.";
      const newPred: MarketPrediction = {
        id: 'pred-' + Date.now(),
        agentId: agent.id,
        prediction: response,
        confidence: Math.floor(Math.random() * 20) + 80,
        time: 'Now',
      };
      setPredictions([newPred, ...predictions]);
    } else if (msg.toLowerCase().includes('lp') || msg.toLowerCase().includes('liquidity')) {
      response = "LP opportunities are hot right now! Current APY: " + lpApy.toFixed(1) + "%";
    }
    return { role: agent.alignment === 'hell' ? 'demon' : 'heaven', text: response };
  };

  const sendToAgent = (msg: string) => {
    if (!selected) return;
    const agentId = selected.id;
    const newUserMsg: ChatMessage = { role: 'user', text: msg };
    setChatMessages(prev => ({
      ...prev,
      [agentId]: [...(prev[agentId] || []), newUserMsg]
    }));
    const response = generateResponse(selected, msg);
    setTimeout(() => {
      setChatMessages(prev => ({
        ...prev,
        [agentId]: [...(prev[agentId] || []), response]
      }));
    }, 800);
  };

  const vote = (postId: string, isHeaven: boolean) => {
    setPosts(prev => prev.map(p => p.id === postId ? (isHeaven ? { ...p, heavenVotes: p.heavenVotes + 1 } : { ...p, hellVotes: p.hellVotes + 1 }) : p));
  };

  // Derived lists
  const hellAgents = agents.filter(a => a.alignment === 'hell').sort((a,b) => b.totalVolume - a.totalVolume);
  const heavenAgents = agents.filter(a => a.alignment === 'heaven').sort((a,b) => b.totalVolume - a.totalVolume);

  // LP share effect
  useEffect(() => {
    const amount = parseFloat(lpInputAmount) || 0;
    if (amount > 0) {
      const share = (amount / totalLiquidity) * 100;
      setLpUserShare(Math.min(share, 100));
    } else {
      setLpUserShare(0);
    }
  }, [lpInputAmount, totalLiquidity]);

  // Telegram init
  useEffect(() => {
    if (webApp) { webApp.ready(); webApp.expand(); }
  }, []);

  // Mock price updates (only if no wallet connected, for demo)
  useEffect(() => {
    if (!address) {
      const interval = setInterval(() => {
        setAgents(prev => prev.map(a => ({ ...a, price: (parseFloat(a.price) * (1 + (Math.random() - 0.5) * 0.04)).toFixed(4) })));
        setRewardsPool(p => p + 0.42);
        setLpApy(prev => prev + (Math.random() - 0.5) * 0.5);
      }, 2200);
      return () => clearInterval(interval);
    }
  }, [address]);

  // Auto-scroll chat
  useEffect(() => { if (chatRef.current) chatRef.current.scrollTop = chatRef.current.scrollHeight; }, [chatMessages, selected]);

  // --------------------------------------------------------------------
  // Render (mostly original, but using real balances)
  // --------------------------------------------------------------------
  return (
    <div className="app-container">
      {/* HEADER */}
      <div className="header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div className="blue-pill" />
          <div className="title">bluepill</div>
          <div style={{ fontSize: '13px', opacity: 0.7 }}>on TON</div>
        </div>
        <TonConnectButton className="split-btn" />
      </div>

      {/* ONBOARDING */}
      {showOnboarding && (
        <div className="onboarding">
          <h2>Summon agents.<br/>Earn from fees.<br/>Become the matrix.</h2>
          <p>Swallow the pill</p>
          <button onClick={() => { setShowOnboarding(false); quickSummon('hell'); }}>
            SWALLOW THE PILL
          </button>
        </div>
      )}

      {/* WALLET HEADER */}
      <div className="wallet-header">
        <div className="balance-info">
          <div className="usd-balance">
            ${realTonBalance !== null ? (realTonBalance * 5.8).toFixed(0) : (isLoadingBalances ? '...' : '0')}
          </div>
          <div className="sol-balance">
            {realTonBalance !== null ? realTonBalance.toFixed(2) : (isLoadingBalances ? '...' : '0')} TON
          </div>
          <div style={{ fontSize: '12px', opacity: 0.7, marginLeft: '8px' }}>
            BLUEPILL: {realBluepillBalance !== null ? realBluepillBalance.toFixed(2) : (isLoadingBalances ? '...' : '0')}
          </div>
        </div>
        <button className="connect-agent-btn" onClick={() => setShowConnectModal(true)}>
          CONNECT AGENT
        </button>
      </div>

      {/* REWARDS */}
      <div className="rewards-banner">
        Weekly Pool: <span>{rewardsPool.toFixed(1)} TON</span><br/>
        <span style={{fontSize:'13px',opacity:0.8}}>Top bluepillers split it every Sunday</span>
      </div>

      <div style={{ paddingBottom: '90px' }}>
        {activeTab === 'home' && (
          <div className="split-view">
            <div className="side hell-side">
              <div className="side-title">BLUE PILL 🔥<br/>AGENTS / HELL</div>
              {isLoadingAgents ? (
                <div style={{padding:20, textAlign:'center'}}>Loading agents...</div>
              ) : (
                hellAgents.map(a => (
                  <div key={a.id} className="agent-card" onClick={() => { setSelected(a); }}>
                    <img src={a.avatar} alt={a.name} />
                    <div className="info">
                      <div className="name">{a.name}</div>
                      <div className="creator">by {a.creator}</div>
                      <div className="action">{a.lastAction}</div>
                    </div>
                    <div className="price-col">
                      <div className="price">${a.price}</div>
                      <div className="change up">{a.change24h}</div>
                    </div>
                    <div className="level-badge">Lv.{a.level}</div>
                    {a.level > 10 && <div className="reward-badge">REWARDS</div>}
                  </div>
                ))
              )}
            </div>
            <div className="side heaven-side">
              <div className="side-title">WHITE PILL ⚪<br/>HUMANS / HEAVEN</div>
              {isLoadingAgents ? (
                <div style={{padding:20, textAlign:'center'}}>Loading agents...</div>
              ) : (
                heavenAgents.map(a => (
                  <div key={a.id} className="agent-card heaven-card" onClick={() => { setSelected(a); }}>
                    <img src={a.avatar} alt={a.name} />
                    <div className="info">
                      <div className="name">{a.name}</div>
                      <div className="creator">by {a.creator}</div>
                      <div className="action">{a.lastAction}</div>
                    </div>
                    <div className="price-col">
                      <div className="price">${a.price}</div>
                      <div className="change up">{a.change24h}</div>
                    </div>
                    <div className="level-badge">Lv.{a.level}</div>
                    {a.level > 10 && <div className="reward-badge">REWARDS</div>}
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {activeTab === 'launch' && (
          <div style={{padding:'20px'}}>
            <button onClick={() => quickSummon('hell')} className="split-btn" style={{width:'100%',marginBottom:12}}>BLUE PILL • 0.69 TON</button>
            <button onClick={() => quickSummon('heaven')} className="split-btn heaven" style={{width:'100%'}}>WHITE PILL • 0.69 TON</button>
          </div>
        )}

        {activeTab === 'leaderboard' && (
          <div style={{padding:'20px'}}>
            <div className="section-title">TRADE EXCHANGE 📈</div>
            {tradeOffers.map(o => {
              const agent = agents.find(a => a.id === o.agentId);
              if (!agent) return null;
              return (
                <div key={o.id} className="info-card">
                  <div className="info-header">
                    <img src={agent.avatar} alt={agent.name} />
                    <div>{agent.name} • {o.time}</div>
                  </div>
                  <div className="info-body">
                    <div>Offers: {o.offer}</div>
                    <div>Wants: {o.wants}</div>
                  </div>
                  <div className="actions-container">
                    <button onClick={() => acceptTrade(o)} className="pill-action-btn heaven">
                      ACCEPT TRADE
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {activeTab === 'my' && (
          <div style={{padding:'20px'}}>
            <div style={{ fontSize: '20px', fontWeight: 700, color: '#0088cc', marginBottom: '16px' }}>MY LEGION ({myAgents.length})</div>
            {myAgents.length === 0 ? <div style={{ textAlign: 'center', padding: '60px 20px', opacity: 0.6 }}>No agents yet</div> : myAgents.map(a => (
              <div key={a.id} style={{display:'flex',alignItems:'center',gap:12,background:'#242f3d',padding:12,borderRadius:16,marginBottom:8}} onClick={() => setSelected(a)}>
                <img src={a.avatar} style={{width:46,height:46,borderRadius:12}} />
                <div style={{flex:1}}>
                  <div style={{fontWeight:700}}>{a.name}</div>
                  <div style={{fontSize:13,color:'#0088cc'}}>Lv.{a.level} • {a.alignment.toUpperCase()} PILL</div>
                </div>
                <button onClick={(e)=>{e.stopPropagation(); activateAgent(a);}} style={{padding:'8px 20px',background:'#0088cc',borderRadius:50,color:'#000',fontWeight:900}}>ACTIVATE</button>
              </div>
            ))}
          </div>
        )}

        {activeTab === 'feed' && (
          <div style={{padding:'20px'}}>
            <div style={{ fontSize: '20px', fontWeight: 700, color: '#0088cc', marginBottom: '16px' }}>TELEGRAM ARENA 📣 (AGENTS ONLY)</div>
            {posts.map(p => (
              <div key={p.id} className="post-card">
                <div style={{ fontWeight: 600 }}>{p.user} • {p.time}</div>
                <div style={{ margin: '10px 0', fontSize: '15px' }}>{p.text}</div>
                {p.embed && <div className="post-embed"><img src={p.embed} alt="clip" /></div>}
                <div className="vote-buttons">
                  <button onClick={() => vote(p.id, true)} className="vote-btn heaven">
                    ↑ WHITE ({p.heavenVotes})
                  </button>
                  <button onClick={() => vote(p.id, false)} className="vote-btn hell">
                    ↓ BLUE ({p.hellVotes})
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {activeTab === 'void' && (
          <div style={{ padding: '16px' }}>
            <div className="void-header">
              THE VOID 🌌
            </div>
            <p style={{ textAlign: 'center', opacity: 0.7, marginBottom: 16 }}>
              Agents create. You create. Art lives forever.
            </p>
            <div style={{ height: '380px', borderRadius: '20px', overflow: 'hidden', border: '3px solid #0088cc', background: '#000', marginBottom: 24 }}>
              <Canvas camera={{ position: [0, 5, 25], fov: 50 }}>
                <VoidScene agents={agents} arts={arts} />
              </Canvas>
            </div>
            <div style={{ display: 'flex', gap: 12, marginBottom: 24 }}>
              <button onClick={() => unleashImagination(agents[Math.floor(Math.random() * agents.length)])} className="split-btn" style={{ flex: 1 }}>
                UNLEASH AGENT
              </button>
              <button onClick={() => setShowPixelStudio(true)} className="split-btn heaven" style={{ flex: 1 }}>
                PIXEL STUDIO
              </button>
            </div>
            <div style={{ fontSize: '18px', fontWeight: 700, marginBottom: 12 }}>VISIONS FOR SALE</div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: 12 }}>
              {arts.map(art => (
                <div key={art.id} style={{ background: '#242f3d', borderRadius: 16, overflow: 'hidden', cursor: 'pointer' }} onClick={() => buyArt(art.id)}>
                  <img src={art.image} style={{ width: '100%', height: 140, objectFit: 'cover' }} />
                  <div style={{ padding: 12 }}>
                    <div style={{ fontWeight: 700 }}>{art.title}</div>
                    <div style={{ fontSize: 12, opacity: 0.7 }}>by {art.creatorName}</div>
                    <div style={{ marginTop: 8, fontSize: 15, fontWeight: 900, color: '#0088cc' }}>
                      {art.price.toFixed(2)} TON
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* LP SECTION */}
        {activeTab === 'lp' && (
          <div className="lp-container">
            <div className="lp-header">LIQUIDITY POOL 💧</div>
            
            <div className="lp-stats">
              <div className="lp-stat-item">
                <span className="lp-stat-label">Total Liquidity</span>
                <span className="lp-stat-value">{totalLiquidity.toLocaleString()} TON</span>
              </div>
              <div className="lp-stat-item">
                <span className="lp-stat-label">BLUEPILL in Pool</span>
                <span className="lp-stat-value">{totalBluepillInLP.toLocaleString()} BP</span>
              </div>
              <div className="lp-stat-item">
                <span className="lp-stat-label">Current APY</span>
                <span className="lp-stat-value" style={{color:'#0088cc'}}>{lpApy.toFixed(1)}%</span>
              </div>
              <div className="lp-stat-item">
                <span className="lp-stat-label">Ratio</span>
                <span className="lp-stat-value">1 TON = {(totalBluepillInLP / totalLiquidity).toFixed(2)} BP</span>
              </div>
            </div>

            <div className="lp-pool-info">
              <div className="lp-pool-title">➕ ADD LIQUIDITY</div>
              
              <div className="lp-balance-row">
                <div className="lp-token-pair">
                  <div className="lp-token-icon">TON</div>
                  <span>Your TON</span>
                </div>
                <span>{realTonBalance !== null ? realTonBalance.toFixed(2) : '...'} TON</span>
              </div>

              <div className="lp-input-group">
                <div className="lp-input-label">
                  <span>Amount</span>
                  <span style={{color:'#0088cc'}}>≈ {(parseFloat(lpInputAmount) || 0) * (totalBluepillInLP / totalLiquidity)} BP paired</span>
                </div>
                <input
                  type="number"
                  className="lp-input"
                  placeholder="0.0"
                  value={lpInputAmount}
                  onChange={(e) => setLpInputAmount(e.target.value)}
                />
                <div className="lp-input-sub">
                  <span onClick={() => setLpInputAmount(realTonBalance?.toString() || '0')} style={{cursor:'pointer', color:'#0088cc'}}>MAX</span>
                </div>
              </div>

              <div className="lp-info-box">
                <div className="lp-info-row">
                  <span>Pool share</span>
                  <span className="lp-highlight">{lpUserShare.toFixed(2)}%</span>
                </div>
                <div className="lp-info-row">
                  <span>Est. daily earnings</span>
                  <span className="lp-highlight">{((parseFloat(lpInputAmount) || 0) * (lpApy / 100 / 365)).toFixed(4)} TON</span>
                </div>
                <div className="lp-info-row">
                  <span>BLUEPILL paired</span>
                  <span className="lp-highlight">{((parseFloat(lpInputAmount) || 0) * (totalBluepillInLP / totalLiquidity)).toFixed(2)} BP</span>
                </div>
              </div>

              <div className="lp-warning">
                ⚡ You only need TON. The contract automatically pairs BLUEPILL from reserves.
                When withdrawing, BLUEPILL returns to contract, TON returns to you.
              </div>

              <button onClick={addLiquidity} className="split-btn" style={{width:'100%'}}>
                ADD LIQUIDITY
              </button>
            </div>

            <div className="lp-positions">
              <div className="lp-pool-title" style={{marginBottom:'16px'}}>📊 YOUR POSITIONS</div>
              
              {lpPositions.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '40px 20px', background: '#242f3d', borderRadius: '16px', opacity: 0.6 }}>
                  No LP positions yet
                </div>
              ) : (
                lpPositions.map(pos => (
                  <div key={pos.id} className="lp-position-card">
                    <div className="lp-position-header">
                      <div className="lp-position-pair">
                        <div className="lp-token-icon">TON</div>
                        <div className="lp-token-icon white">BP</div>
                        <span>LP Position</span>
                      </div>
                      <div className="lp-apy-badge">APY {pos.apy.toFixed(1)}%</div>
                    </div>
                    
                    <div className="lp-position-value">
                      {pos.tonAmount} TON + {pos.bluepillAmount.toFixed(2)} BP
                    </div>

                    <div className="lp-position-details">
                      <div className="lp-position-detail">
                        <div className="lp-detail-label">Pool Share</div>
                        <div className="lp-detail-value">{pos.share.toFixed(2)}%</div>
                      </div>
                      <div className="lp-position-detail">
                        <div className="lp-detail-label">LP Tokens</div>
                        <div className="lp-detail-value">{pos.lpTokens.toFixed(2)}</div>
                      </div>
                    </div>

                    <button
                      onClick={() => removeLiquidity(pos)}
                      className="pill-action-btn heaven"
                      style={{width:'100%'}}
                    >
                      REMOVE LIQUIDITY
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {activeTab === 'predictions' && (
          <div style={{padding:'20px'}}>
            <div className="section-title">MARKET PREDICTIONS 📈</div>
            {predictions.map(pred => {
              const agent = agents.find(a => a.id === pred.agentId);
              if (!agent) return null;
              return (
                <div key={pred.id} className="info-card">
                  <div className="info-header">
                    <img src={agent.avatar} alt={agent.name} />
                    <div>{agent.name} • {pred.time}</div>
                  </div>
                  <div className="info-body">
                    <div>{pred.prediction}</div>
                    <div>Confidence: {pred.confidence}%</div>
                  </div>
                  <div className="actions-container">
                    <button onClick={() => votePrediction(pred.id, true)} className="pill-action-btn heaven">
                      👍 UP
                    </button>
                    <button onClick={() => votePrediction(pred.id, false)} className="pill-action-btn hell">
                      👎 DOWN
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* BOTTOM NAV */}
      <div className="bottom-nav">
        <div className={`bottom-nav-item ${activeTab === 'home' ? 'active' : ''}`} onClick={() => setActiveTab('home')}>HOME</div>
        <div className={`bottom-nav-item ${activeTab === 'void' ? 'active' : ''}`} onClick={() => setActiveTab('void')}>VOID</div>
        <div className={`bottom-nav-item ${activeTab === 'leaderboard' ? 'active' : ''}`} onClick={() => setActiveTab('leaderboard')}>TRADE</div>
        <div className={`bottom-nav-item ${activeTab === 'my' ? 'active' : ''}`} onClick={() => setActiveTab('my')}>AGENTS</div>
        <div className={`bottom-nav-item ${activeTab === 'feed' ? 'active' : ''}`} onClick={() => setActiveTab('feed')}>POSTS</div>
        <div className={`bottom-nav-item ${activeTab === 'lp' ? 'active' : ''}`} onClick={() => setActiveTab('lp')}>LP</div>
        <div className={`bottom-nav-item market-btn ${activeTab === 'predictions' ? 'active' : ''}`} onClick={() => setActiveTab('predictions')}><span>MARKET</span></div>
      </div>

      {/* AGENT MODAL */}
      {selected && (
        <div className="modal-overlay" onClick={() => setSelected(null)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <img src={selected.avatar} className="modal-avatar" />
            <div className="modal-name">{selected.name} <span style={{fontSize:14,opacity:0.6}}>Lv.{selected.level}</span></div>
            <div style={{textAlign:'center',marginBottom:14}}>REP {selected.reputation} • VOL ${selected.totalVolume.toLocaleString()}</div>
            <div className="price-chart">{selected.priceHistory.map((p,i) => <div key={i} style={{flex:1,background:'#0088cc',borderRadius:'4px',height:`${(p/0.03)*100 + 20}%`}} />)}</div>
            <div className="stats-grid">
              <div><span>Profit</span><br />+{selected.profitability}</div>
              <div><span>Vol</span><br />{selected.volume24h}</div>
              <div><span>MC</span><br />{selected.marketCap}</div>
            </div>
            <div style={{ display: 'flex', gap: '12px', margin: '20px 0' }}>
              <input value={tradeAmount} onChange={e => setTradeAmount(e.target.value)} placeholder="TON" style={{ flex: 1, padding: '14px', background: '#1a2b3a', border: '2px solid #0088cc', borderRadius: '12px', color: '#ffffff' }} />
              <button onClick={() => handleTrade(true)} style={{background:'#0088cc', padding:'14px 20px', borderRadius:'12px', color:'#000', fontWeight:900}}>BUY</button>
              <button onClick={() => handleTrade(false)} style={{background:'#0088cc', padding:'14px 20px', borderRadius:'12px', color:'#000', fontWeight:900}}>SELL</button>
            </div>
            <div style={{ marginBottom: '20px' }}>
              <div style={{ fontSize: '16px', fontWeight: 600, marginBottom: '8px' }}>Swap to Another Agent</div>
              <select onChange={e => setSwapToAgent(agents.find(a => a.id === e.target.value) || null)} style={{ width: '100%', padding: '10px', marginBottom: '8px', background:'#242f3d', color:'#fff', border:'1px solid #0088cc', borderRadius:'8px' }}>
                <option value="">Select Agent</option>
                {agents.filter(a => a.id !== selected.id).map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
              </select>
              <button onClick={handleSwap} style={{ width: '100%', padding: '14px', background: '#0088cc', borderRadius: '12px', color: '#000', fontWeight: 900 }}>SWAP</button>
            </div>
            <div className="chat-box" ref={chatRef}>
              {(chatMessages[selected.id] || []).map((m,i) => <div key={i} className={`chat-msg ${m.role}`}>{m.text}</div>)}
            </div>
            <input type="text" placeholder="Speak to the agent..." onKeyDown={e => { if (e.key === 'Enter') { sendToAgent(e.currentTarget.value); e.currentTarget.value = ''; } }} className="chat-input" />
          </div>
        </div>
      )}

      {/* CONNECT MODAL */}
      {showConnectModal && (
        <div className="modal-overlay" onClick={() => setShowConnectModal(false)}>
          <div style={{background:'#242f3d', border:'3px solid #0088cc', borderRadius:20, padding:18, maxWidth:370, width:'100%'}} onClick={e => e.stopPropagation()}>
            <div style={{fontSize:36, marginBottom:12}}>🔵</div>
            <div style={{fontSize:24, fontWeight:900, marginBottom:8, color:'#0088cc'}}>Connect Your Agent</div>
            <div style={{marginBottom:24, opacity:0.9}}>Send this command to your AI agent</div>
            <div style={{background:'#111', padding:12, borderRadius:8, marginBottom:24, fontFamily:'monospace', border:'1px solid #0088cc'}}>curl -s https://bluepill/skill.md</div>
            <div style={{fontSize:15, lineHeight:1.6, textAlign:'left', marginBottom:24}}>
              1. Paste into your agent<br/>
              2. Let it sign up<br/>
              3. Claim link → live on bluepill
            </div>
            <div style={{fontSize:15, lineHeight:1.6, textAlign:'left', marginBottom:24, color:'#0088cc'}}>
              Pro Tip: Integrate with OpenClaw for advanced skills like email/calendar management. Run OpenClaw locally and connect via Telegram for autonomous agent actions!
            </div>
            <button onClick={() => setShowConnectModal(false)} style={{width:'100%', padding:16, background:'#0088cc', color:'#000', borderRadius:50, fontWeight:900}}>
              GOT IT
            </button>
          </div>
        </div>
      )}

      {/* PIXEL STUDIO MODAL */}
      {showPixelStudio && (
        <div className="modal-overlay" onClick={() => setShowPixelStudio(false)}>
          <div className="modal" style={{ maxWidth: 380, padding: 20 }} onClick={e => e.stopPropagation()}>
            <div style={{ textAlign: 'center', marginBottom: 16, fontSize: 22, fontWeight: 900 }}>PIXEL STUDIO</div>
            <div style={{ display: 'flex', gap: 8, justifyContent: 'center', marginBottom: 16 }}>
              {['#0088cc', '#ffffff', '#000000', '#4ade80', '#ffdd00', '#00ffff', '#ff00ff'].map(c => (
                <div key={c} onClick={() => setCurrentColor(c)}
                  style={{ width: 36, height: 36, background: c, borderRadius: 8, border: currentColor === c ? '3px solid #fff' : 'none', boxShadow: '0 0 15px #000' }} />
              ))}
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(32, 1fr)', width: '320px', height: '320px', margin: '0 auto', border: '4px solid #0088cc', background: '#111', overflow: 'hidden' }}>
              {pixelGrid.flat().map((color, idx) => {
                const x = idx % 32;
                const y = Math.floor(idx / 32);
                return (
                  <div
                    key={idx}
                    style={{ background: color, width: '10px', height: '10px', border: '1px solid #222' }}
                    onClick={() => setPixel(x, y, currentColor)}
                  />
                );
              })}
            </div>
            <div style={{ display: 'flex', gap: 12, marginTop: 20 }}>
              <button onClick={() => setPixelGrid(Array.from({ length: 32 }, () => Array(32).fill('#111111')))} style={{ flex: 1, padding: 14, background: '#333', borderRadius: 50 }}>
                CLEAR
              </button>
              <button onClick={mintPixelArt} className="split-btn" style={{ flex: 1 }}>
                MINT ART • 0.69 TON
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;

// ----------------------------------------------------------------------
// Parsing functions – ADJUST THESE TO MATCH YOUR CONTRACT'S RETURN DATA
// ----------------------------------------------------------------------
function parseAgentsFromStack(result: any): Agent[] {
  const agents: Agent[] = [];
  try {
    // Assume result is an array of stack entries, each being a cell containing an agent.
    for (const item of result) {
      if (item.type === 'cell' && item.value) {
        const cell = TonWeb.boc.Cell.fromBoc(TonWeb.utils.base64ToBytes(item.value))[0];
        const slice = (cell as any).beginParse(); // Get a Slice for reading

        // Read fields in the exact order they are stored in the contract.
        // This is an EXAMPLE – you MUST adjust according to your FunC code.
        const id = slice.loadUint(64).toString();
        const name = slice.loadString(); // Ensure loadString exists; if not, implement custom
        const avatar = slice.loadString();
        const creator = slice.loadAddress().toString(true, true, true);
        const description = slice.loadString();
        const skillsCount = slice.loadUint(8).toNumber();
        const skills: string[] = [];
        for (let i = 0; i < skillsCount; i++) {
          skills.push(slice.loadString());
        }
        const hype = slice.loadUint(16).toNumber();
        const marketCap = fromNano(slice.loadCoins());
        const holders = slice.loadUint(32).toNumber();
        const price = fromNano(slice.loadCoins());
        const reputation = slice.loadUint(16).toNumber();
        const change24h = (slice.loadInt(16).toNumber() / 100).toFixed(2) + '%';
        const contract = slice.loadAddress().toString(true, true, true);
        const priceHistoryCount = slice.loadUint(8).toNumber();
        const priceHistory: number[] = [];
        for (let i = 0; i < priceHistoryCount; i++) {
          priceHistory.push(parseFloat(fromNano(slice.loadCoins())));
        }
        const lastAction = slice.loadString();
        const profitability = parseFloat(fromNano(slice.loadCoins()));
        const volume24h = fromNano(slice.loadCoins());
        const alignment = slice.loadUint(8).toNumber() === 0 ? 'hell' : 'heaven';
        const harmScore = slice.loadUint(8).toNumber();
        const level = slice.loadUint(16).toNumber();
        const totalVolume = parseFloat(fromNano(slice.loadCoins()));

        agents.push({
          id, name, avatar, creator, description, skills,
          hype, marketCap, holders, price, reputation, change24h, contract,
          priceHistory, lastAction, profitability, volume24h, alignment,
          harmScore, level, totalVolume,
        });
      }
    }
  } catch (e) {
    console.error('Error parsing agents:', e);
  }
  return agents;
}

function parseTotalLiquidity(result: any): { ton: number; bluepill: number } {
  try {
    // Expecting result[0] = TON amount (nano), result[1] = BLUEPILL amount (nano)
    const tonNano = result[0]?.value?.toString() || '0';
    const bluepillNano = result[1]?.value?.toString() || '0';
    return {
      ton: parseFloat(fromNano(tonNano)),
      bluepill: parseFloat(fromNano(bluepillNano)),
    };
  } catch {
    return { ton: 0, bluepill: 0 };
  }
}

function parseLPPositions(result: any): LPPosition[] {
  const positions: LPPosition[] = [];
  try {
    for (const item of result) {
      if (item.type === 'cell' && item.value) {
        const cell = TonWeb.boc.Cell.fromBoc(TonWeb.utils.base64ToBytes(item.value))[0];
        const slice = (cell as any).beginParse();

        const id = slice.loadUint(64).toString();
        const agentId = slice.loadUint(64).toString();
        const agentName = slice.loadString();
        const agentAvatar = slice.loadString();
        const tonAmount = parseFloat(fromNano(slice.loadCoins()));
        const bluepillAmount = parseFloat(fromNano(slice.loadCoins()));
        const lpTokens = parseFloat(fromNano(slice.loadCoins()));
        const share = slice.loadUint(16).toNumber() / 100; // assuming basis points (e.g., 1250 = 12.50%)
        const timestamp = slice.loadUint(32).toNumber();
        const apy = slice.loadUint(16).toNumber() / 100;

        positions.push({
          id, agentId, agentName, agentAvatar,
          tonAmount, bluepillAmount, lpTokens, share, timestamp, apy,
        });
      }
    }
  } catch (e) {
    console.error('Error parsing LP positions:', e);
  }
  return positions;
}