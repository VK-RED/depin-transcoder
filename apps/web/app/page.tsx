import Link from "next/link";
import { Zap, Globe, BadgeDollarSign } from 'lucide-react';
import { auth } from "@clerk/nextjs/server";
import { LandingPageButton } from "./components/LandingPageButton";

export default async function Page(){

  const {userId} = await auth();

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white">
      {/* Hero Section */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-20 pb-16">
        <div className="text-center">
          <h1 className="text-4xl tracking-tight font-extrabold text-gray-900 sm:text-5xl md:text-6xl">
            <span className="block">Decentralized Video Transcoding</span>
            <span className="block text-indigo-600">Powered by DePIN</span>
          </h1>
          <p className="mt-3 max-w-md mx-auto text-base text-gray-500 sm:text-lg md:mt-5 md:text-xl md:max-w-3xl">
            Transform your videos with the power of decentralized networks. Fast, secure, and efficient video transcoding for everyone.
          </p>
          <div className="mt-5 max-w-md mx-auto flex flex-col space-y-3 sm:space-y-0 sm:flex-row sm:justify-center space-x-4 md:mt-8">
            {userId ? <Link
              href="/dashboard"
              className="flex items-center justify-center px-8 py-3 border border-transparent text-base font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 md:py-3 md:text-lg md:px-6"
            >
              Transcode
            </Link> : <LandingPageButton/>}

            <Link
              href="/validator"
              className="flex items-center justify-center px-6 py-3 border border-transparent text-base font-medium rounded-md text-indigo-700 bg-indigo-100 hover:bg-indigo-200 md:py-3 md:text-lg md:px-6"
            >
              Validator
            </Link>
          </div>
        </div>
      </div>

      {/* Features Section */}
      <div className="py-16 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 gap-8 md:grid-cols-3">
            <div className="flex flex-col items-center text-center">
              <div className="flex items-center justify-center h-12 w-12 rounded-md bg-indigo-500 text-white">
                <Zap className="h-6 w-6" />
              </div>
              <h3 className="mt-6 text-lg font-medium text-gray-900">Lightning Fast</h3>
              <p className="mt-2 text-base text-gray-500">
                Leverage the power of distributed networks for rapid video transcoding.
              </p>
            </div>

            <div className="flex flex-col items-center text-center">
              <div className="flex items-center justify-center h-12 w-12 rounded-md bg-indigo-500 text-white">
                <BadgeDollarSign className="h-6 w-6" />
              </div>
              <h3 className="mt-6 text-lg font-medium text-gray-900">Earn in SOL</h3>
              <p className="mt-2 text-base text-gray-500">
                Run as a Validator and get rewards
              </p>
            </div>

            <div className="flex flex-col items-center text-center">
              <div className="flex items-center justify-center h-12 w-12 rounded-md bg-indigo-500 text-white">
                <Globe className="h-6 w-6" />
              </div>
              <h3 className="mt-6 text-lg font-medium text-gray-900">Decentralized</h3>
              <p className="mt-2 text-base text-gray-500">
                No single point of failure. Your videos are processed across a global network.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}