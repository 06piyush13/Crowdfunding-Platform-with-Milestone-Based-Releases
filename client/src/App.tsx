import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom';
import Home from './pages/Home';
import Project from './pages/Project';
import { connectFreighter, getPublicKey } from './utils/freighter';

const App: React.FC = () => {
  const [walletConnected, setWalletConnected] = useState(false);
  const [walletAddress, setWalletAddress] = useState<string>('');

useEffect(() => {
  (async () => {
    try {
      const publicKey = await getPublicKey();
      if (publicKey) {
        setWalletConnected(true);
        setWalletAddress(publicKey);
      }
    } catch {
      console.log('Freighter not connected');
    }
  })();
}, []);
  

  const checkWalletConnection = async () => {
    try {
      const publicKey = await getPublicKey();
      if (publicKey) {
        setWalletConnected(true);
        setWalletAddress(publicKey);
      }
    } catch (error) {
      console.log('Wallet not connected');
    }
  };

  const handleConnectWallet = async () => {
    try {
      const success = await connectFreighter();
      if (success) {
        const publicKey = await getPublicKey();
        setWalletConnected(true);
        setWalletAddress(publicKey);
      }
    } catch (error) {
      alert('Failed to connect wallet. Make sure Freighter is installed.');
    }
  };

  return (
    <Router>
      <div style={styles.container}>
        {/* Header */}
        <header style={styles.header}>
          <Link to="/" style={styles.logo}>
            🚀 Crowdfunding Platform
          </Link>
          <div style={styles.walletSection}>
            {walletConnected ? (
              <div style={styles.walletInfo}>
                <span style={styles.walletIndicator}>🟢</span>
                <span style={styles.walletAddress}>
                  {walletAddress.slice(0, 6)}...{walletAddress.slice(-4)}
                </span>
              </div>
            ) : (
              <button style={styles.connectButton} onClick={handleConnectWallet}>
                Connect Freighter
              </button>
            )}
          </div>
        </header>

        {/* Main Content */}
        <main style={styles.main}>
          <Routes>
            <Route path="/" element={<Home walletAddress={walletAddress} />} />
            <Route
              path="/project/:id"
              element={<Project walletAddress={walletAddress} walletConnected={walletConnected} />}
            />
          </Routes>
        </main>

        {/* Footer */}
        <footer style={styles.footer}>
          <p>Stellar Testnet • Soroban Smart Contracts</p>
        </footer>
      </div>
    </Router>
  );
};

const styles: { [key: string]: React.CSSProperties } = {
  container: {
    minHeight: '100vh',
    display: 'flex',
    flexDirection: 'column',
  },
  header: {
    background: 'rgba(255, 255, 255, 0.95)',
    padding: '1rem 2rem',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
  },
  logo: {
    fontSize: '1.5rem',
    fontWeight: 'bold',
    color: '#667eea',
    textDecoration: 'none',
  },
  walletSection: {
    display: 'flex',
    alignItems: 'center',
  },
  walletInfo: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
    padding: '0.5rem 1rem',
    background: '#f0f4ff',
    borderRadius: '8px',
  },
  walletIndicator: {
    fontSize: '0.8rem',
  },
  walletAddress: {
    fontFamily: 'monospace',
    fontSize: '0.9rem',
    color: '#333',
  },
  connectButton: {
    padding: '0.6rem 1.5rem',
    background: '#667eea',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    fontSize: '1rem',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'all 0.2s',
  },
  main: {
    flex: 1,
    padding: '2rem',
    maxWidth: '1200px',
    width: '100%',
    margin: '0 auto',
  },
  footer: {
    background: 'rgba(255, 255, 255, 0.9)',
    padding: '1rem',
    textAlign: 'center',
    color: '#666',
    fontSize: '0.9rem',
  },
};

export default App;