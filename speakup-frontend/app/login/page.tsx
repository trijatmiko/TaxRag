// app/login/page.tsx
import { GlowOrbs } from "@/components/auth/GlowOrbs";
import { LoginCard } from "@/components/auth/LoginCard";

export const metadata = { title: "SpeakUp — Sign In" };

export default function LoginPage() {
  return (
    <main className="relative bg-bg min-h-screen overflow-hidden text-text font-dm text-[15px] leading-relaxed">
      <GlowOrbs />
      <LoginCard />
    </main>
  );
}