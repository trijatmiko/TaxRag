// hooks/useAuth.ts
"use client";
import { useRouter } from "next/navigation";
import { signIn, signUp, googleAuth, forgotPassword } from "@/lib/api";
import { useSession } from "./useSession";
import { useToast } from "./useToast";
import { AuthResponse } from "@/types/auth";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "/dashboard";

export function useAuth() {
    const router = useRouter();
    const session = useSession();
    const { toast, showToast } = useToast();

    const handleSuccess = (data: AuthResponse, welcomeMsg: string) => {
        session.saveSession({
            token: data.token,
            userId: data.user.id,
            name: data.user.name,
            level: data.user.level || "A1",
        });
        showToast(welcomeMsg, "success");
        setTimeout(() => router.push(APP_URL), 600);
    };

    const handleSignIn = async (email: string, password: string) => {
        const data = await signIn(email, password);
        handleSuccess(data, `Welcome back, ${data.user.name}! 🎉`);
    };

    const handleSignUp = async (firstName: string, lastName: string, email: string, password: string) => {
        const name = `${firstName} ${lastName}`.trim();
        const data = await signUp(name, email, password);
        handleSuccess(data, `Account created! Welcome, ${firstName}! 🎉`);
    };

    const handleGoogleToken = async (accessToken: string) => {
        const data = await googleAuth(accessToken);
        handleSuccess(data, `Welcome, ${data.user.name}! 🎉`);
    };

    const handleForgotPassword = async (email: string): Promise<string> => {
        await forgotPassword(email);
        return `If ${email} is registered, a reset link has been sent. Check your spam folder too.`;
    };

    return { handleSignIn, handleSignUp, handleGoogleToken, handleForgotPassword, toast, showToast };
}