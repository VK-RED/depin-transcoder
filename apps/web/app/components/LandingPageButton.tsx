'use client';

import { Button } from "@/components/ui/button";
import { SignInButton } from "@clerk/nextjs";

export const LandingPageButton = () => {
    return (

        <SignInButton>
            <Button className="flex items-center h-14 justify-center px-8 py-3 border border-transparent text-base font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 md:text-lg md:px-4 md:py-6 cursor-pointer">
                Get Started
            </Button>
        </SignInButton>
        
    )
}