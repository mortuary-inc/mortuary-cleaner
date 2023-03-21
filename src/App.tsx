import { WalletAdapterNetwork } from '@solana/wallet-adapter-base';
import { ConnectionProvider, WalletProvider } from '@solana/wallet-adapter-react';
import { WalletModalProvider } from '@solana/wallet-adapter-react-ui';
import { GlowWalletAdapter, LedgerWalletAdapter, PhantomWalletAdapter, SolflareWalletAdapter, SolletExtensionWalletAdapter, SolletWalletAdapter } from '@solana/wallet-adapter-wallets';
import { Cluster, clusterApiUrl } from '@solana/web3.js';
import type { FC } from 'react';
import { useMemo } from 'react';
import { BrowserRouter, Route, Routes, useSearchParams } from 'react-router-dom';
import Layout from './components/Layout';
import { HomePage } from './pages/HomePage';
import { AppProvider } from './hooks/useAppContext';
import Cleaner from './pages/Cleaner';
import { Toaster } from 'react-hot-toast';

export const App: FC = () => {
  return (
    <BrowserRouter>
      <AppInner />
    </BrowserRouter>
  );
};

const AppInner: FC = () => {

  let [searchParams] = useSearchParams();

  let cluster = searchParams.get("cluster") ?? WalletAdapterNetwork.Mainnet;

  const { network, endpoint } = useMemo(() => {
    let network: WalletAdapterNetwork = WalletAdapterNetwork.Mainnet;
    let endpoint = clusterApiUrl(network);
    if (cluster == "devnet") {
      network = WalletAdapterNetwork.Devnet;
      endpoint = clusterApiUrl(network);
    } else {
      network = WalletAdapterNetwork.Mainnet;
      if (cluster != "mainnet-beta") {
        endpoint = cluster;
      } else {
        endpoint = "https://api.metaplex.solana.com/";
      }
    }
    return { network, endpoint }
  }, [cluster]);

  const wallets = useMemo(
    () => [
      new PhantomWalletAdapter(),
      new SolflareWalletAdapter(),
      new LedgerWalletAdapter(),
      new GlowWalletAdapter(),
      new SolletWalletAdapter({ network }),
      new SolletExtensionWalletAdapter({ network }),
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [network]
  );

  console.log("Using network " + endpoint);

  return (

    <AppProvider network={network}>
      <ConnectionProvider endpoint={endpoint}>
        <WalletProvider wallets={wallets} autoConnect>
          <WalletModalProvider>
            <Layout>
              <Routes>
                <Route path="/" element={<Cleaner />} />
              </Routes>
            </Layout>
          </WalletModalProvider>
          <Toaster position="bottom-left" reverseOrder={false} />
        </WalletProvider>
      </ConnectionProvider>
    </AppProvider>
  );
};

