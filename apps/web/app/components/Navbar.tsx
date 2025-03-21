'use client'

import {
    SignInButton,
    SignUpButton,
    SignedIn,
    SignedOut,
    UserButton,
    useAuth,
  } from '@clerk/nextjs'
import axios from 'axios';
import { useEffect } from 'react';
import { BACKEND_URL } from '../../constants';

export const Navbar = () => {

    const {getToken} = useAuth();

    useEffect(()=>{
        // sendRequest();
        sendWsRequest();
    },[])

    const sendRequest = async () => {

        const token = await getToken();

        if(!token){
            console.log("No token");
            return;
        }
        console.log("Sending Request");
        
        const {data} = await axios.get(`${BACKEND_URL}/api/videos`,{
            headers:{
                authorization: token,
            }
        });
        
    }

    const sendWsRequest = async () => {
        const wsUrl = "ws://localhost:8081";
        const ws = new WebSocket(wsUrl);

        ws.onopen = () => {
            ws.send("Hello from client");
        }

        ws.onmessage = (event) => {
            console.log("Received message from server");
            console.log(event.data);
        }
    }

  return (
    <div className="flex h-16 items-center justify-between bg-white px-4 shadow-sm">
        <div className="flex items-center space-x-4">
            <a href="/" className="text-2xl font-bold">
            Depin Video Transcoder
            </a>
        </div>
        <div className="flex items-center space-x-4">
            <header className="flex justify-end items-center p-4 gap-4 h-16">
                <SignedOut>
                    <SignInButton />
                    <SignUpButton />
                </SignedOut>
                <SignedIn>
                    <UserButton />
                </SignedIn>
            </header>
        </div>
    </div>
  );
};