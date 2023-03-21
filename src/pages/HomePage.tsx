import { Alert, Snackbar } from "@mui/material";
import { useWallet } from "@solana/wallet-adapter-react";
import { FC, useState } from "react";

export const HomePage: FC = () => {

    const { publicKey: walletPublicKey, connected, sendTransaction } = useWallet();

    const [alertState, setAlertState] = useState<AlertState>({
        open: false,
        message: "",
        severity: undefined,
    });

    let wallet = (connected && walletPublicKey) ? walletPublicKey : null;


    return (
        <main>
            hi
        </main>
    )
};

interface AlertState {
    open: boolean;
    message: string;
    severity: "success" | "info" | "warning" | "error" | undefined;
}

const renderCounter = ({ days, hours, minutes, seconds, completed }: any) => {
    return (
        <span style={{ color: "white" }}>
            {hours + (days || 0) * 24} hours, {minutes} minutes, {seconds} seconds
        </span>
    );
};