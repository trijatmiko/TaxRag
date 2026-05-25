// types/auth.ts

export type AuthTab = "signin" | "signup" | "forgot" | "success";

export interface User {
    id: string;
    name: string;
    level: string;
}

export interface AuthResponse {
    success: boolean;
    token: string;
    user: User;
    error?: string;
}

export interface SessionData {
    token: string;
    userId: string;
    name: string;
    level: string;
}

export interface ToastState {
    message: string;
    type: "error" | "success" | "info";
    visible: boolean;
}