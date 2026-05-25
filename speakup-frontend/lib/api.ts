// lib/api.ts
import { AuthResponse } from "@/types/auth";

const N8N_BASE_URL = process.env.NEXT_PUBLIC_N8N_BASE_URL || "http://localhost:5678/webhook";

export const ENDPOINTS = {
    SIGNIN: `${N8N_BASE_URL}/auth/signin`,
    SIGNUP: `${N8N_BASE_URL}/auth/signup`,
    FORGOT: `${N8N_BASE_URL}/auth/forgot-password`,
    GOOGLE: `${N8N_BASE_URL}/auth/google`,
};

export async function signIn(email: string, password: string): Promise<AuthResponse> {
    const res = await fetch(ENDPOINTS.SIGNIN, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
    });
    const data = await res.json();
    if (!res.ok || !data.success) throw new Error(data.error || "Email atau password salah");
    return data;
}

export async function signUp(name: string, email: string, password: string): Promise<AuthResponse> {
    const res = await fetch(ENDPOINTS.SIGNUP, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, password }),
    });
    const data = await res.json();
    if (!res.ok || !data.success) throw new Error(data.error || "Sign up gagal");
    return data;
}

export async function googleAuth(accessToken: string): Promise<AuthResponse> {
    const res = await fetch(ENDPOINTS.GOOGLE, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ access_token: accessToken }),
    });
    const data = await res.json();
    if (!res.ok || !data.success) throw new Error(data.error || "Google authentication failed");
    return data;
}

export async function forgotPassword(email: string): Promise<void> {
    try {
        await fetch(ENDPOINTS.FORGOT, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email }),
        });
    } catch {
        // Intentional: selalu tampilkan success untuk menghindari user enumeration
        console.warn("Forgot password request error (hidden for security)");
    }
}