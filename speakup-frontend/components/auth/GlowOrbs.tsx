// components/auth/GlowOrbs.tsx
export function GlowOrbs() {
    return (
        <>
            <div className="fixed rounded-full pointer-events-none z-0 opacity-[0.18] blur-[120px] w-[600px] h-[600px] bg-accent -top-[200px] -left-[150px] animate-orb-float1" />
            <div className="fixed rounded-full pointer-events-none z-0 opacity-[0.18] blur-[120px] w-[400px] h-[400px] bg-accent2 -bottom-[100px] -right-[100px] animate-orb-float2" />
        </>
    );
}