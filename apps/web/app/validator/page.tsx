'use client';

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import axios from "axios";
import { useState } from "react";
import { BACKEND_URL } from "../../constants";
import {toast} from "sonner"

export default function Page() {
    
    const LAMPORTS_PER_SOL = 1000_000_000;

    const[publicKey, setPublicKey] = useState("");

    const [availablePayout, setAvailablePayout] = useState(0);

    const getMoney = async () => {

        if(!publicKey){
            toast.error("Validator address is required");
            return;
        }

        const {data}:{data:{message:string, payout?:number}} = await axios.post(`${BACKEND_URL}/api/payout/${publicKey}`);
        
        if(data.message){
            toast(data.message);
        }

        setAvailablePayout(data.payout || 0);
    }

    return (
        <div className="flex flex-col items-center justify-center w-screen relative">

            <div className="flex flex-col items-center justify-center w-full absolute top-52 space-y-4">
                <h2 className="scroll-m-20 pb-2 text-3xl font-bold tracking-tight first:mt-0">
                    Enter your Validator <span className="text-indigo-600">Solana Address</span>
                </h2>

                <div className="flex w-full max-w-sm items-center space-x-2">
                    <Input 
                        value={publicKey} 
                        onChange={(e) => setPublicKey(e.target.value)}
                        type="text" 
                        placeholder="871xmP8k....." 
                        required
                    />
                    <Button 
                        className="flex items-center justify-center px-8 py-3 border border-transparent text-base font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 md:py-5 md:text-lg md:px-3 cursor-pointer"

                        onClick={getMoney} type="button"
                    >
                        Get My Money
                    </Button>
                </div>

                {!!availablePayout && 
                    <h4 className="scroll-m-20 text-xl font-medium tracking-tight mt-20">
                        Your <span className="text-2xl font-semibold">{availablePayout / LAMPORTS_PER_SOL} SOL</span> will be paid shortly
                    </h4>
                }
            </div>
            
        </div>
    );
}