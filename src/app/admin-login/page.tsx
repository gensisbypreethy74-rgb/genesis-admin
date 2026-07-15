'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import axios from 'axios';

export default function AdminLoginPage() {
  const [showPassword, setShowPassword] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState<{ email?: string; password?: string }>({});
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  // Redirect to dashboard if already logged in
  useEffect(() => {
    const token = localStorage.getItem('adminToken');
    if (token) {
      router.push('/dashboard');
    }
  }, [router]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Client-side validation
    const errors: { email?: string; password?: string } = {};
    if (!email.trim()) {
      errors.email = 'Email is required.';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      errors.email = 'Please enter a valid email address.';
    }
    if (!password) {
      errors.password = 'Password is required.';
    } else if (password.length < 6) {
      errors.password = 'Password must be at least 6 characters.';
    }
    setFieldErrors(errors);
    if (Object.keys(errors).length > 0) return;
    
    setError('');
    setLoading(true);

    try {
      const res = await axios.post(`${process.env.NEXT_PUBLIC_BACKEND_URL}/v1/auth/login`, { email, password }, { withCredentials: true });
      const data = res.data;

      if (data.success) {
        localStorage.setItem('adminToken', data.data.token);
        localStorage.setItem('adminUser', JSON.stringify(data.data));

        router.push('/dashboard');
      } else {
        setError(data.message || 'Invalid email or password');
      }
    } catch (err) {
      setError('Connection refused. Is the backend server running?');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#131B2A] flex items-center justify-center p-4 font-sans relative overflow-hidden">
      {/* Background glow effects */}
      <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] rounded-full bg-[#5b3db8]/5 blur-[120px] pointer-events-none"></div>
      <div className="absolute bottom-[-20%] right-[-10%] w-[50%] h-[50%] rounded-full bg-[#5b3db8]/5 blur-[120px] pointer-events-none"></div>

      {/* Login Card */}
      <div className="w-full max-w-[420px] bg-[#1E2536] rounded-[24px] p-10 shadow-2xl relative z-10 border border-white/[0.05]">

        {/* Header */}
        <div className="flex flex-col items-center mb-8">
          <div className="w-[64px] h-[64px] bg-gradient-to-tr from-[#4a2f96] to-[#5b3db8] rounded-[20px] flex items-center justify-center mb-6 shadow-lg shadow-[#5b3db8]/20">
            <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path>
              <polyline points="9 12 11 14 15 10"></polyline>
            </svg>
          </div>
          <h1 className="text-white text-[28px] font-bold tracking-tight mb-2">NeoKart Admin</h1>
          <p className="text-slate-400 text-[14px]">Secure Management Portal Access</p>
        </div>

        {error && (
          <div className="bg-red-500/10 border border-red-500/50 text-red-400 text-[13px] p-3 rounded-[12px] mb-6 text-center font-medium">
            {error}
          </div>
        )}

        {/* Form */}
        <form className="space-y-6" onSubmit={handleLogin}>

          {/* Email Field */}
          <div>
            <label className="block text-slate-300 text-[13px] font-semibold mb-2">Administrator Email</label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#64748b" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path><polyline points="22,6 12,13 2,6"></polyline></svg>
              </div>
              <input
                type="email"
                value={email}
                onChange={(e) => { setEmail(e.target.value); setFieldErrors(prev => ({...prev, email: undefined})); }}
                placeholder="Enter your email"
                className={`w-full h-[52px] bg-[#2A344A] text-white placeholder-slate-500 rounded-[14px] pl-11 pr-4 border focus:bg-[#2A344A] focus:outline-none focus:ring-1 focus:ring-[#5b3db8] transition-all text-[15px] ${fieldErrors.email ? 'border-red-500 focus:border-red-500' : 'border-transparent focus:border-[#5b3db8]'}`}
              />
            </div>
            {fieldErrors.email && <p className="text-red-400 text-xs mt-1.5 font-medium">{fieldErrors.email}</p>}
          </div>

          {/* Password Field */}
          <div>
            <label className="block text-slate-300 text-[13px] font-semibold mb-2">Security Password</label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#64748b" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg>
              </div>
              <input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => { setPassword(e.target.value); setFieldErrors(prev => ({...prev, password: undefined})); }}
                placeholder="••••••••"
                className={`w-full h-[52px] bg-[#2A344A] text-white placeholder-slate-500 rounded-[14px] pl-11 pr-11 border focus:bg-[#2A344A] focus:outline-none focus:ring-1 focus:ring-[#5b3db8] transition-all text-[15px] ${fieldErrors.password ? 'border-red-500 focus:border-red-500' : 'border-transparent focus:border-[#5b3db8]'}`}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute inset-y-0 right-0 pr-4 flex items-center text-slate-400 hover:text-white transition-colors"
              >
                {showPassword ? (
                  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg>
                ) : (
                  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path><line x1="1" y1="1" x2="23" y2="23"></line></svg>
                )}
              </button>
            </div>
            {fieldErrors.password && <p className="text-red-400 text-xs mt-1.5 font-medium">{fieldErrors.password}</p>}
          </div>

          {/* Submit Button */}
          <div className="pt-4">
            <button
              type="submit"
              disabled={loading}
              className={`w-full h-[52px] bg-[#5b3db8] hover:bg-[#5b3db8] text-white rounded-[14px] font-bold text-[15px] flex items-center justify-center gap-2 transition-all shadow-lg shadow-[#5b3db8]/25 ${loading ? 'opacity-70 cursor-not-allowed' : ''}`}
            >
              {loading ? 'Authenticating...' : 'Access Dashboard'}
              {!loading && <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="5" y1="12" x2="19" y2="12"></line><polyline points="12 5 19 12 12 19"></polyline></svg>}
            </button>
          </div>

        </form>

        {/* Footer */}
        <div className="mt-10 pt-8 border-t border-slate-700/50 flex flex-col items-center gap-4">
          <p className="text-slate-500 text-[11px] font-semibold tracking-wider uppercase">
            © 2026 NeoKart Luxury Cosmetics
          </p>
          <div className="bg-[#064e3b]/30 text-[#10b981] px-4 py-1.5 rounded-full text-[10px] font-bold tracking-widest uppercase border border-[#064e3b]/50">
            256-BIT AES ENCRYPTED SESSION
          </div>
        </div>

      </div>
    </div>
  );
}
