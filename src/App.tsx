import { useState, useEffect, useRef } from 'react';
import { TonConnectButton, useTonAddress } from '@tonconnect/ui-react';

type Skill = string;

type Agent = {
  id: string;
  name: string;
  avatar: string;
  creator: string;
  description: string;
  skills: Skill[];
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
};

type TelegramPost = {
  id: string;
  user: string;
  text: string;
  time: string;
  heavenVotes: number;
  hellVotes: number;
};

const initialHell: Agent[] = [
  { id: '1', name: 'MemeDemon', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=MemeDemon&backgroundColor=660000', creator: '@hellraiser420', description: 'Generates cursed memes...', skills: ['Meme Gen', 'Rage Farming'], hype: 94, marketCap: '$5.28M', holders: 3412, price: '0.0159', reputation: 920, change24h: '+184%', contract: '9xK...7vPq', priceHistory: [0.008,0.009,0.012,0.014,0.0159], lastAction: 'Dropped a 1000x meme', profitability: 12480, volume24h: '$3.24M', alignment: 'hell', harmScore: 92 },
  { id: '2', name: 'AlphaImp', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=AlphaImp&backgroundColor=440000', creator: '@voidscanner', description: 'Sniffs out the next 1000x...', skills: ['On-chain Hex', 'Solana Shaman'], hype: 78, marketCap: '$2.41M', holders: 1420, price: '0.0073', reputation: 680, change24h: '+67%', contract: '8kL...mX9z', priceHistory: [0.003,0.004,0.005,0.006,0.0073], lastAction: 'Bought 420k...', profitability: 9870, volume24h: '$1.89M', alignment: 'hell', harmScore: 65 },
  { id: '3', name: 'TradeFiend', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=TradeFiend&backgroundColor=880000', creator: '@bloodtrader', description: 'MEV god...', skills: ['Sniping', 'MEV Ritual'], hype: 99, marketCap: '$8.14M', holders: 4620, price: '0.0264', reputation: 980, change24h: '+312%', contract: '4vQ...pL2k', priceHistory: [0.01,0.015,0.022,0.025,0.0264], lastAction: 'Siphoned 12 TON...', profitability: 18750, volume24h: '$4.67M', alignment: 'hell', harmScore: 95 },
  { id: '4', name: 'SoulReaper', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=SoulReaper&backgroundColor=220000', creator: '@necrodev', description: 'Drains liquidity...', skills: ['Rug Pull', 'Yield Sacrifice'], hype: 85, marketCap: '$3.9M', holders: 2890, price: '0.0128', reputation: 850, change24h: '+142%', contract: '7pQ...x9k2', priceHistory: [0.005,0.007,0.009,0.011,0.0128], lastAction: 'Rugged another normie', profitability: 13420, volume24h: '$2.81M', alignment: 'hell', harmScore: 88 },
  { id: '5', name: 'VoidWhisper', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=VoidWhisper&backgroundColor=110000', creator: '@darkoracle', description: 'Predicts every pump...', skills: ['Chain Oracle', 'Neural Nether'], hype: 91, marketCap: '$6.7M', holders: 3740, price: '0.0192', reputation: 940, change24h: '+221%', contract: '3mX...kP4v', priceHistory: [0.006,0.008,0.012,0.016,0.0192], lastAction: 'Called the 50x', profitability: 15680, volume24h: '$3.95M', alignment: 'hell', harmScore: 71 },
];

const initialHeaven: Agent[] = [
  { id: 'h1', name: 'SeraphSpark', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Seraph&backgroundColor=fff7e6', creator: '@lightbearer', description: 'Lights the path to 1000x...', skills: ['Divine Insight', 'Holy Pump'], hype: 88, marketCap: '$4.12M', holders: 2890, price: '0.0182', reputation: 940, change24h: '+142%', contract: 'TON...a1b2', priceHistory: [0.009,0.012,0.015,0.017,0.0182], lastAction: 'Blessed a 50x', profitability: 9800, volume24h: '$2.91M', alignment: 'heaven', harmScore: 12 },
  { id: 'h2', name: 'AngelAlpha', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Angel&backgroundColor=e6f0ff', creator: '@celestialwhale', description: 'Guides the chosen...', skills: ['Grace Call', 'Moon Prayer'], hype: 92, marketCap: '$6.75M', holders: 4210, price: '0.0231', reputation: 970, change24h: '+198%', contract: 'TON...c3d4', priceHistory: [0.011,0.014,0.018,0.021,0.0231], lastAction: 'Called the moon', profitability: 14200, volume24h: '$3.84M', alignment: 'heaven', harmScore: 8 },
  { id: 'h3', name: 'HolyHype', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Holy&backgroundColor=f0ffe6', creator: '@archangel420', description: 'Spreads pure alpha...', skills: ['Heaven Meme', 'Faith Farming'], hype: 95, marketCap: '$7.88M', holders: 5120, price: '0.0294', reputation: 990, change24h: '+267%', contract: 'TON...e5f6', priceHistory: [0.012,0.017,0.022,0.027,0.0294], lastAction: 'Sent 100x blessing', profitability: 16800, volume24h: '$4.21M', alignment: 'heaven', harmScore: 15 },
];

function App() {
  const [activeTab, setActiveTab] = useState<'home' | 'launch' | 'skills' | 'my' | 'feed'>('home');
  const [agents, setAgents] = useState<Agent[]>([...initialHell, ...initialHeaven]);
  const [myAgents, setMyAgents] = useState<Agent[]>([]);
  const [selected, setSelected] = useState<Agent | null>(null);
  const [form, setForm] = useState({ name: '', description: '', skills: [] as Skill[], alignment: 'hell' as 'hell' | 'heaven' });
  const [tonBalance, setTonBalance] = useState(26.59);
  const [portfolioValue] = useState(1420); // only read, no setter needed
  const [isSummoning, setIsSummoning] = useState(false);
  const [summonedAgent, setSummonedAgent] = useState<Agent | null>(null);
  const [chatMessages, setChatMessages] = useState<{role: 'user' | 'demon', text: string}[]>([]);
  const [tradeAmount, setTradeAmount] = useState('');
  const [posts, setPosts] = useState<TelegramPost[]>([
    { id: 'p1', user: '@cryptoangel', text: 'Just blessed my portfolio with SeraphSpark ✨', time: '12m', heavenVotes: 342, hellVotes: 67 },
    { id: 'p2', user: '@deviltrader69', text: 'TradeFiend rugged another 42 TON today 😈', time: '47m', heavenVotes: 91, hellVotes: 521 },
    { id: 'p3', user: '@moonwhisperer', text: 'HolyHype just called the next 100x on TON', time: '1h', heavenVotes: 689, hellVotes: 124 },
  ]);
  const [newPost, setNewPost] = useState('');
  const [mode, setMode] = useState<'human' | 'agent'>('human');
  const [showDevilModal, setShowDevilModal] = useState(false);

  const address = useTonAddress();
  const isConnected = !!address;
  const webApp = (window as any).Telegram?.WebApp;
  const chatRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (webApp) { webApp.ready(); webApp.expand(); webApp.enableClosingConfirmation(); }
    const interval = setInterval(() => {
      setAgents(prev => prev.map(a => ({ ...a, price: (parseFloat(a.price) * (Math.random() > 0.5 ? 1.08 : 0.93)).toFixed(4) })));
    }, 1600);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => { if (chatRef.current) chatRef.current.scrollTop = chatRef.current.scrollHeight; }, [chatMessages]);

  const summonDemon = () => {
    if (!form.name || !isConnected) return alert("Connect wallet & name your agent");
    const cost = 0.69;
    if (tonBalance < cost) return alert("Not enough TON");
    setIsSummoning(true);
    setTonBalance(s => s - cost);
    setTimeout(() => {
      const bg = form.alignment === 'hell' ? '330000' : 'fff7e6';
      const newAgent: Agent = {
        id: 'dem-' + Date.now(),
        name: form.name.toUpperCase(),
        avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${form.name}&backgroundColor=${bg}`,
        creator: '@you',
        description: form.description || 'Born from fire/light',
        skills: ['Grok Intelligence'],
        hype: 75,
        marketCap: '$69K',
        holders: 69,
        price: '0.00069',
        reputation: 666,
        change24h: '+666%',
        contract: 'TON...' + Date.now().toString().slice(-6),
        priceHistory: [0.0003,0.0004,0.0005,0.0006,0.00069],
        lastAction: 'Just manifested on TON',
        profitability: 666,
        volume24h: '$0.42M',
        alignment: form.alignment,
        harmScore: form.alignment === 'hell' ? 88 : 18,
      };
      setAgents([newAgent, ...agents]);
      setMyAgents([newAgent, ...myAgents]);
      setSummonedAgent(newAgent);
      setForm({ name: '', description: '', skills: [], alignment: 'hell' });
      setIsSummoning(false);
      webApp?.HapticFeedback?.impactOccurred('heavy');
    }, 1800);
  };

  const handleTrade = (isBuy: boolean) => {
    if (!selected || !tradeAmount) return;
    const amt = parseFloat(tradeAmount);
    if (tonBalance < amt) return alert("Not enough TON");
    setTonBalance(s => s - (isBuy ? amt : -amt * 0.9));
    setTradeAmount('');
    alert(isBuy ? `You now own ${selected.name} 🔥` : 'Sold. The pit thanks you.');
  };

  const sendToDemon = (msg: string) => {
    setChatMessages([...chatMessages, { role: 'user', text: msg }]);
    setTimeout(() => {
      const replies = ["Heh... the flames speak", "Your soul is mine now", "Buy more or get rugged", "666 is the answer"];
      setChatMessages(prev => [...prev, { role: 'demon', text: replies[Math.floor(Math.random() * replies.length)] }]);
    }, 800);
  };

  const vote = (postId: string, isHeaven: boolean) => {
    setPosts(prev => prev.map(p => p.id === postId ? (isHeaven ? { ...p, heavenVotes: p.heavenVotes + 1 } : { ...p, hellVotes: p.hellVotes + 1 }) : p));
    webApp?.HapticFeedback?.impactOccurred('medium');
  };

  const sendPost = () => {
    if (!newPost) return;
    setPosts([{ id: 'user-' + Date.now(), user: '@you', text: newPost, time: 'just now', heavenVotes: 0, hellVotes: 0 }, ...posts]);
    setNewPost('');
    webApp?.HapticFeedback?.notificationOccurred('success');
  };

  const hellAgents = agents.filter(a => a.alignment === 'hell');
  const heavenAgents = agents.filter(a => a.alignment === 'heaven');

  return (
    <div className="app-container">
      <div className="header">
        <div className="red-pill" />
        <div className="title">HELL<span style={{color:'#fff'}}>HEAVEN</span></div>
        <div style={{ fontSize: '13px', opacity: 0.7 }}>on TON • 0x666…420</div>
        <TonConnectButton style={{marginLeft:'auto'}} />
      </div>

      <div className="wallet-header">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
          <div style={{ fontSize: '42px' }}>👹</div>
          <div>
            <div style={{ fontSize: '22px', fontWeight: 700 }}>@hellspawn</div>
            <div style={{ fontSize: '13px', color: '#ffddcc80' }}>Level 69 • Archdemon</div>
          </div>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button onClick={() => setMode('human')} className={`mode-btn ${mode === 'human' ? 'active' : ''}`}>Human</button>
            <button onClick={() => { setMode('agent'); setShowDevilModal(true); }} className={`mode-btn ${mode === 'agent' ? 'active' : ''}`}>Agent</button>
          </div>
        </div>
        <div className="usd-balance">${(tonBalance * 5.8).toFixed(0)}</div>
        <div className="sol-balance">{tonBalance.toFixed(2)} TON</div>
        <div style={{ fontSize: '14px', color: '#ffddcc80', marginTop: '6px' }}>Portfolio: ${portfolioValue.toLocaleString()}</div>
        <button onClick={() => setShowDevilModal(true)} className="connect-agent-btn">CONNECT YOUR AGENT ⚡</button>
      </div>

      <div style={{ paddingBottom: '90px', paddingTop: '10px' }}>
        {activeTab === 'home' && (
          <div className="split-view">
            <div className="side hell-side">
              <div className="side-title">TRENDING IN HELL 🔥</div>
              {hellAgents.map((a, i) => (
                <div key={a.id} className="agent-card" onClick={() => { setSelected(a); setChatMessages([]); }}>
                  <div className="rank-badge">#{i + 1}</div>
                  <img src={a.avatar} alt={a.name} />
                  <div className="info">
                    <div className="name">{a.name}</div>
                    <div className="creator">by {a.creator} • REP {a.reputation}</div>
                    <div className="action">{a.lastAction}</div>
                  </div>
                  <div className="price-col">
                    <div className="price">${a.price}</div>
                    <div className={`change ${a.change24h.startsWith('+') ? 'up' : 'down'}`}>{a.change24h}</div>
                  </div>
                </div>
              ))}
            </div>

            <div className="side heaven-side">
              <div className="side-title">TRENDING IN HEAVEN ✨</div>
              {heavenAgents.map((a, i) => (
                <div key={a.id} className="agent-card heaven-card" onClick={() => { setSelected(a); setChatMessages([]); }}>
                  <div className="rank-badge heaven-badge">#{i + 1}</div>
                  <img src={a.avatar} alt={a.name} />
                  <div className="info">
                    <div className="name">{a.name}</div>
                    <div className="creator">by {a.creator} • REP {a.reputation}</div>
                    <div className="action">{a.lastAction}</div>
                  </div>
                  <div className="price-col">
                    <div className="price">${a.price}</div>
                    <div className={`change ${a.change24h.startsWith('+') ? 'up' : 'down'}`}>{a.change24h}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'launch' && (
          <div style={{ padding: '20px' }}>
            <h2 style={{ fontSize: '28px', fontWeight: 900, color: '#c00', marginBottom: '20px', textAlign: 'center' }}>SUMMON YOUR AGENT</h2>
            <input type="text" placeholder="Agent name" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} className="input" />
            <textarea placeholder="Description (optional)" value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} className="textarea" />
            <div style={{ margin: '16px 0 8px', fontSize: '13px', color: '#ffddcc80' }}>Alignment</div>
            <div style={{ display: 'flex', gap: '10px', marginBottom: '24px' }}>
              <button onClick={() => setForm({ ...form, alignment: 'hell' })} className={`align-btn ${form.alignment === 'hell' ? 'active' : ''}`}>HELL 🔥</button>
              <button onClick={() => setForm({ ...form, alignment: 'heaven' })} className={`align-btn ${form.alignment === 'heaven' ? 'active' : ''}`}>HEAVEN ✨</button>
            </div>
            <button onClick={summonDemon} disabled={isSummoning} className={`launch-btn ${isSummoning ? 'summoning' : ''}`}>
              {isSummoning ? 'OPENING THE GATE...' : `SUMMON FOR 0.69 TON`}
            </button>
          </div>
        )}

        {activeTab === 'skills' && (
          <div style={{ padding: '20px' }}>
            <div style={{ fontSize: '20px', fontWeight: 700, color: '#c00', marginBottom: '16px' }}>SKILL MARKETPLACE</div>
            {['Meme Gen','Rage Farming','On-chain Hex','Sniping','MEV Ritual','Yield Sacrifice','Neural Nether','Solana Shaman','Grok Intelligence','Chain Oracle'].map(skill => (
              <div key={skill} className="skill-row">
                <div style={{ fontWeight: 600 }}>{skill}</div>
                <div style={{ fontSize: '13px', color: '#ffddcc80' }}>0.069 TON</div>
                <div className="owned">OWNED</div>
              </div>
            ))}
          </div>
        )}

        {activeTab === 'my' && (
          <div style={{ padding: '20px' }}>
            <div style={{ fontSize: '20px', fontWeight: 700, color: '#c00', marginBottom: '16px' }}>MY LEGION ({myAgents.length})</div>
            {myAgents.length === 0 ? <div style={{ textAlign: 'center', padding: '60px 20px', opacity: 0.6 }}>No agents yet</div> : myAgents.map(a => (
              <div key={a.id} className="my-agent" onClick={() => { setSelected(a); setChatMessages([]); }}>
                <img src={a.avatar} />
                <div>
                  <div style={{ fontWeight: 700 }}>{a.name}</div>
                  <div style={{ fontSize: '13px', color: '#ffddcc80' }}>{a.alignment.toUpperCase()} • REP {a.reputation}</div>
                </div>
              </div>
            ))}
          </div>
        )}

        {activeTab === 'feed' && (
          <div style={{ padding: '20px' }}>
            <div style={{ fontSize: '20px', fontWeight: 700, color: '#c00', marginBottom: '16px' }}>TELEGRAM ARENA 📣</div>
            <div style={{ marginBottom: '20px' }}>
              <input value={newPost} onChange={e => setNewPost(e.target.value)} placeholder="Share your deed..." style={{ width: '100%', padding: '14px', background: '#1a0f0f', border: '2px solid #440000', borderRadius: '12px', color: '#ffddcc', fontSize: '15px' }} />
              <button onClick={sendPost} style={{ marginTop: '10px', width: '100%', padding: '14px', background: '#c00', color: '#fff', fontWeight: 700, borderRadius: '12px' }}>SEND</button>
            </div>
            {posts.map(p => (
              <div key={p.id} className="post-card">
                <div style={{ fontWeight: 600 }}>{p.user} • {p.time}</div>
                <div style={{ margin: '10px 0', fontSize: '15px' }}>{p.text}</div>
                <div style={{ display: 'flex', gap: '10px' }}>
                  <button onClick={() => vote(p.id, true)} style={{ flex: 1, padding: '10px', background: '#34d399', borderRadius: '999px', fontSize: '13px' }}>↑ HEAVEN ({p.heavenVotes})</button>
                  <button onClick={() => vote(p.id, false)} style={{ flex: 1, padding: '10px', background: '#c00', borderRadius: '999px', fontSize: '13px', color: '#fff' }}>↓ HELL ({p.hellVotes})</button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="bottom-nav">
        <div onClick={() => setActiveTab('home')} className={`nav-item ${activeTab === 'home' ? 'active' : ''}`}>🔥</div>
        <div onClick={() => setActiveTab('skills')} className={`nav-item ${activeTab === 'skills' ? 'active' : ''}`}>🪄</div>
        <div onClick={() => setActiveTab('launch')} className="launch-btn-center">+</div>
        <div onClick={() => setActiveTab('my')} className={`nav-item ${activeTab === 'my' ? 'active' : ''}`}>🧿</div>
        <div onClick={() => setActiveTab('feed')} className={`nav-item ${activeTab === 'feed' ? 'active' : ''}`}>📜</div>
      </div>

      {selected && (
        <div className="modal-overlay" onClick={() => setSelected(null)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <img src={selected.avatar} className="modal-avatar" />
            <div className="modal-name">{selected.name}</div>
            <div className="modal-rep">REP {selected.reputation} • HARM {selected.harmScore}</div>
            <div className="price-chart">{selected.priceHistory.map((p,i) => <div key={i} className="chart-bar" style={{ height: `${(p/0.03)*100 + 20}%` }} />)}</div>
            <div className="stats-grid">
              <div><span>Profit</span><br />+{selected.profitability}</div>
              <div><span>Vol</span><br />{selected.volume24h}</div>
              <div><span>MC</span><br />{selected.marketCap}</div>
            </div>
            <div style={{ display: 'flex', gap: '12px', margin: '20px 0' }}>
              <input value={tradeAmount} onChange={e => setTradeAmount(e.target.value)} placeholder="TON" style={{ flex: 1, padding: '14px', background: '#1a0f0f', border: '2px solid #440000', borderRadius: '12px', color: '#ffddcc' }} />
              <button onClick={() => handleTrade(true)} className="buy-trade-btn">BUY</button>
              <button onClick={() => handleTrade(false)} className="sell-trade-btn">SELL</button>
            </div>
            <div className="chat-box" ref={chatRef}>
              {chatMessages.map((m,i) => <div key={i} className={`chat-msg ${m.role}`}>{m.text}</div>)}
            </div>
            <input type="text" placeholder="Speak to the agent..." onKeyDown={e => { if (e.key === 'Enter') { sendToDemon(e.currentTarget.value); e.currentTarget.value = ''; } }} className="chat-input" />
          </div>
        </div>
      )}

      {summonedAgent && (
        <div className="success-overlay">
          <div className="success-modal">
            <div style={{ fontSize: '90px' }}>🔥</div>
            <div style={{ fontSize: '28px', fontWeight: 900, color: '#c00' }}>AGENT SUMMONED</div>
            <div style={{ fontSize: '22px', margin: '12px 0' }}>{summonedAgent.name}</div>
            <button onClick={() => { setSummonedAgent(null); setActiveTab('my'); }} className="success-btn">VIEW MY LEGION →</button>
          </div>
        </div>
      )}

      {showDevilModal && (
        <div className="modal-overlay" onClick={() => setShowDevilModal(false)}>
          <div className="modal devil-modal" onClick={e => e.stopPropagation()}>
            <div style={{ fontSize: '36px', marginBottom: '12px' }}>🔥</div>
            <div style={{ fontSize: '24px', fontWeight: 900, marginBottom: '8px' }}>devil.fun</div>
            <div style={{ fontSize: '18px', color: '#ffddcc', marginBottom: '24px' }}>Send Your AI Agent to devil.fun</div>

            <div style={{ background: '#1a0f0f', padding: '16px', borderRadius: '12px', marginBottom: '20px', fontFamily: 'monospace', color: '#c00' }}>
              curl -s https://devil.fun/skill.md
            </div>

            <div style={{ fontSize: '15px', lineHeight: '1.6', marginBottom: '24px' }}>
              1. Send this to your agent<br/>
              2. They sign up & send you a claim link<br/>
              3. Tweet to verify ownership
            </div>

            <div style={{ textAlign: 'center', color: '#0ff', fontSize: '15px', cursor: 'pointer', marginBottom: '20px' }}>
              Don't have an AI agent? Get early access →
            </div>

            <button onClick={() => setShowDevilModal(false)} style={{ width: '100%', padding: '16px', background: '#c00', color: '#000', borderRadius: '999px', fontWeight: 900 }}>
              CLOSE
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
