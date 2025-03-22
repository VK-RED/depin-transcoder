'use client';

import { useState } from "react";
import axios from "axios";
import { BACKEND_URL } from "../../constants";
import { useAuth } from "@clerk/nextjs";


export default function Page(){

    const [file, setFile] = useState<File|null>(null);
    const [uploadUrl, setUploadUrl] = useState<string|null>(null);
    const {getToken} = useAuth();

    const getUploadUrl = async () => {

        const token = await getToken();

        if(!file){
            return 
        }

        const {data} : {data: {url : string, key:string}} = await axios.get(`${BACKEND_URL}/api/preSignedUrl?fileName=${file.name}`, {
            headers:{
                authorization: token
            }
        });
        setUploadUrl(data.url);
        console.log(data);
    }

    const uploadVideo = async () => {

        if(!uploadUrl){
            toast("Upload URL not found");
            return;
        }

        if(!file){
            toast("File not found");
            return;
        }

        const res = await axios.put(uploadUrl, file, {
            headers:{
                "Content-Type": file.type
            },
        });

        console.log(res);
    }

    return (
        <div className="flex flex-col items-center justify-center h-screen">
            {/* allow only mp4 files */}
            <input 
                type="file" 
                onChange={(e)=>{
                    const uploadedFile = e.target.files![0];
                    console.log(uploadedFile);
                    setFile(uploadedFile || null);
                }} 
                accept=".mp4"
            />
            <div>
            <button onClick={getUploadUrl}>Get Upload URL</button>
            </div>
            
            <div>
            <button onClick={uploadVideo}>Upload Video</button>
            </div>
            
        </div>
    )
}