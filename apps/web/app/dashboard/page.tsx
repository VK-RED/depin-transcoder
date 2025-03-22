'use client';


import React, { useEffect, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { Upload } from 'lucide-react';
import { BACKEND_URL } from '../../constants';
import { useAuth } from '@clerk/nextjs';
import axios from 'axios';
import { VideoItem } from 'common/types';
import { useRouter } from 'next/navigation';
import { toast } from "sonner"
import { VideoCard } from '../components/Videocard';

export default function Page(){

    const {getToken, isLoaded, isSignedIn} = useAuth();
    const [uploadedFile, setUploadedFile] = useState<File | null>(null);
    const [preSignedData, setPreSignedData] = useState<{url:string, key:string} | null>(null);
    const [videos, setVideos] = useState<VideoItem[]>([]);
    const router = useRouter();
    const [isExpanded, setIsExpanded] = useState<{[key: string]: boolean}>({});


    useEffect(()=>{

        let interval:Timer;

        if(isLoaded && !isSignedIn){
            router.push("/");
        }
        else{
            // get videos every 5 seconds
            getVideos();
            interval = setInterval(getVideos, 1000*5);
        }

        return () => clearInterval(interval);

    },[isLoaded, isSignedIn]);

    useEffect(()=>{
        if(uploadedFile){
            getPreSignedUrl();
        }
    },[uploadedFile]);

    useEffect(()=>{
        if(preSignedData){
            uploadVideo();
        }
    },[preSignedData]);

    const getPreSignedUrl = async () => {

        if(!uploadedFile){
            toast("Please Upload a File")
            return
        }   
        const accessToken = await getToken();

        const response = await axios.get(`${BACKEND_URL}/api/preSignedUrl?fileName=${uploadedFile.name}`,{
            headers:{
                "Authorization": accessToken,
            }
        });
        const data : {url:string, key:string} = response.data;
        setPreSignedData(data);
    }

    const uploadVideo = async () => {

        if(!preSignedData){
            toast("Please get pre-signed url first");
            return;
        }

        if(!uploadedFile){
            toast("Please upload a file first");
            return;
        }

        const res = await axios.put(preSignedData.url, uploadedFile, {
            headers: {
                "Content-Type": uploadedFile.type,
            }
        });

        if(res.status === 200){
            await registerVideo();
            return;
        }
        else{
            toast("Failed to upload video, Please try again");
            return;
        }

    }

    const registerVideo = async () => {

        if(!preSignedData){
            toast("Please get pre-signed url first");
            return;
        }

        if(!uploadedFile){
            toast("Please upload a file first");
            return;
        }

        const body : {key:string, title?:string} = {
            key: preSignedData?.key,
            title: uploadedFile.name || "video.mp4"
        }

        setUploadedFile(null);
        const accessToken = await getToken();
        const res = await axios.post(`${BACKEND_URL}/api/video`, body, {
            headers:{
                Authorization: accessToken
            }
        });

        if(res.data.success){
            toast("Video queued for transcoding");
            return;
        }
        else{
            toast("Failed to queue video for transcoding, Please try again");
            return;
        }
    }

    const onDrop = (acceptedFiles: File[]) => {
        const fileToUpload = acceptedFiles[0] || null;
        setUploadedFile(fileToUpload);
    };

    const { getRootProps, getInputProps, isDragActive } = useDropzone({
        onDrop,
        accept: {
        'video/*': ['.mp4']
        },
        maxFiles:1
    });

    const getVideos = async () => {
        const accessToken = await getToken();
        if(accessToken){
            const res = await axios.get(`${BACKEND_URL}/api/videos`, {
                headers: {
                    Authorization: accessToken,
                }
            });
    
            const data : VideoItem[] = res.data;
            setVideos(data);
        }
        else{
            console.log("No token found to get videos");
        }
        
    }

    if(isLoaded && isSignedIn){

        return (
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                <div className="bg-white rounded-lg shadow p-6 mb-8">
                    <h2 className="text-2xl font-bold text-gray-900 mb-4">Upload Video</h2>
                    <div
                    {...getRootProps()}
                    className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${
                        isDragActive ? 'border-indigo-500 bg-indigo-50' : 'border-gray-300 hover:border-indigo-500'
                    }`}
                    >
                    <input {...getInputProps()} />
                    <Upload className="h-12 w-12 mx-auto text-gray-400" />
                    <p className="mt-2 text-sm text-gray-600">
                        Drag and drop your video here, or click to select a file
                    </p>
                    <p className="text-xs text-gray-500 mt-1">
                        Supported format: MP4
                    </p>
                    </div>
                </div>

                <div className="bg-white rounded-lg shadow">
                    <div className="px-6 py-4 border-b border-gray-200">
                        <h2 className="text-xl font-semibold text-gray-900">Your Videos</h2>
                    </div>
                    <div className="divide-y divide-gray-200">
                    {videos.map((video) => (
                        <VideoCard
                            isExpanded={isExpanded}
                            setIsExpanded={setIsExpanded}
                            video={video}
                            key={video.id}
                        />
                    ))}
                    </div>
                </div>
            </div>
        );
    }
}