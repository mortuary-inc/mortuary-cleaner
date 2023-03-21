import { WalletAdapterNetwork } from '@solana/wallet-adapter-base';
import React, { createContext, useContext } from 'react';

export interface AppContextState {
    network: WalletAdapterNetwork;
}

export const AppContext = createContext<AppContextState>({} as AppContextState);

export function useApp(): AppContextState {
    return useContext(AppContext);
}

export const AppProvider = ({ children, network }: { children: React.ReactNode, network: WalletAdapterNetwork }) => {


    return React.createElement(AppContext.Provider, { value: { network } }, children);
};
