import { SignIn } from '@clerk/nextjs';

export default function SignInPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 relative overflow-hidden">
      {/* Animated background elements */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-purple-500 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-pulse" />
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-purple-700 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-pulse delay-700" />
      </div>

      <div className="relative z-10 animate-fade-in">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-white mb-2">Welcome Back</h1>
          <p className="text-slate-300">Continue your learning journey</p>
        </div>
        <SignIn 
          appearance={{
            elements: {
              rootBox: "mx-auto",
              card: "shadow-2xl rounded-2xl",
              headerTitle: "text-2xl font-bold",
              headerSubtitle: "text-slate-600",
              socialButtonsBlockButton: "border-2 hover:bg-slate-50 transition-all",
              formButtonPrimary: "bg-purple-600 hover:bg-purple-700 transition-all",
              footerActionLink: "text-purple-600 hover:text-purple-700"
            }
          }}
          forceRedirectUrl="/dashboard"
        />
      </div>
    </div>
  );
}
