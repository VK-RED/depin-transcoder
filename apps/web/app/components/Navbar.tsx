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
import { Video, Layout } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

export const Navbar = () => {

    const pathName = usePathname();

  return (
    <nav className="bg-white shadow-sm">
      <div className="mx-auto px-4 sm:px-6 lg:px-12">
        <div className="flex justify-between h-16">
          <div className="flex items-center">
            <Link href="/" className="flex items-center">
              <Video className="h-8 w-8 text-indigo-600" />
              <span className="ml-2 text-xl font-bold text-gray-900">DePIN Transcoder</span>
            </Link>
          </div>
          <div className="flex items-center space-x-4">
            {pathName!== "/dashboard" && 
                <div className="flex items-center space-x-4">
                    <Link
                    href="/dashboard"
                    className={`flex items-center px-3 py-2 rounded-md text-sm font-medium bg-indigo-100 text-indigo-700`}
                    >
                    <Layout className="h-5 w-5 mr-2" />
                    Dashboard
                    </Link>
                </div>
            }
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
      </div>
    </nav>
  );
};


/*
    <header className="flex justify-end items-center p-4 gap-4 h-16">
                <SignedOut>
                    <SignInButton />
                    <SignUpButton />
                </SignedOut>
                <SignedIn>
                    <UserButton />
                </SignedIn>
            </header>
*/