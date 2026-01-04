/**
 * Login Page - Premium Design
 * 
 * Features:
 * - Navy & Gold theme
 * - Remember me checkbox (7 days)
 * - Error handling
 * - Gradient background
 */

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { LogIn, User, Lock, Eye, EyeOff, Package } from 'lucide-react';
import { useAuthStore } from '../stores/authStore';
import { Button, Input } from '../components/ui';
import { THEME } from '../constants/theme';

export function Login() {
    const navigate = useNavigate();
    const { login, isLoading, error, isAuthenticated, clearError } = useAuthStore();

    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [rememberMe, setRememberMe] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const [cooldown, setCooldown] = useState(0); // H3 FIX: Cooldown after failed attempt

    // Redirect if already authenticated
    useEffect(() => {
        if (isAuthenticated) {
            navigate('/', { replace: true });
        }
    }, [isAuthenticated, navigate]);

    // Clear error when inputs change
    useEffect(() => {
        if (error) clearError();
    }, [username, password]);

    // H3 FIX: Cooldown timer effect
    useEffect(() => {
        if (cooldown > 0) {
            const timer = setTimeout(() => setCooldown(c => c - 1), 1000);
            return () => clearTimeout(timer);
        }
    }, [cooldown]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        // Prevent submit during cooldown
        if (!username.trim() || !password || cooldown > 0) return;

        const success = await login(username.trim(), password, rememberMe);
        if (success) {
            navigate('/', { replace: true });
        } else {
            // H3 FIX: 3 second cooldown after failed attempt
            setCooldown(3);
        }
    };

    return (
        <div
            className="min-h-screen flex items-center justify-center p-4"
            style={{
                background: `linear-gradient(135deg, ${THEME.navy} 0%, #0d1b2a 50%, ${THEME.navy}ee 100%)`,
            }}
        >
            {/* Decorative elements */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
                <div
                    className="absolute top-20 right-20 w-72 h-72 rounded-full blur-3xl opacity-20"
                    style={{ backgroundColor: THEME.gold }}
                />
                <div
                    className="absolute bottom-20 left-20 w-96 h-96 rounded-full blur-3xl opacity-10"
                    style={{ backgroundColor: THEME.gold }}
                />
            </div>

            {/* Login Card */}
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, type: 'spring', stiffness: 100 }}
                className="relative w-full max-w-md bg-white/95 backdrop-blur-xl rounded-3xl shadow-2xl overflow-hidden"
                style={{ boxShadow: `0 25px 50px -12px rgba(0, 0, 0, 0.4), 0 0 0 1px ${THEME.gold}20` }}
            >
                {/* Top gradient bar */}
                <div
                    className="h-2 w-full"
                    style={{ background: `linear-gradient(90deg, ${THEME.gold}, ${THEME.navy}, ${THEME.gold})` }}
                />

                <div className="p-8">
                    {/* Logo & Title */}
                    <div className="text-center mb-8">
                        <div
                            className="inline-flex items-center justify-center w-20 h-20 rounded-2xl mb-4 shadow-lg"
                            style={{
                                background: `linear-gradient(135deg, ${THEME.navy} 0%, ${THEME.navy}dd 100%)`,
                                boxShadow: `0 10px 30px -10px ${THEME.navy}80`
                            }}
                        >
                            <Package className="w-10 h-10 text-white" />
                        </div>
                        <h1
                            className="text-2xl font-bold mb-1"
                            style={{ color: THEME.navy, fontFamily: "'Amiri', serif" }}
                        >
                            نظام إدارة صيانة الهواتف
                        </h1>
                        <p className="text-gray-500 text-sm">Mayo Fix | Mayo Tech</p>
                    </div>

                    {/* Login Form */}
                    <form onSubmit={handleSubmit} className="space-y-5">
                        {/* Username */}
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-slate-700 flex items-center gap-2">
                                <User className="w-4 h-4" style={{ color: THEME.gold }} />
                                اسم المستخدم
                            </label>
                            <Input
                                type="text"
                                value={username}
                                onChange={(e) => setUsername(e.target.value)}
                                placeholder="admin"
                                className="h-12 text-lg"
                                autoFocus
                                autoComplete="username"
                                disabled={isLoading}
                            />
                        </div>

                        {/* Password */}
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-slate-700 flex items-center gap-2">
                                <Lock className="w-4 h-4" style={{ color: THEME.gold }} />
                                كلمة المرور
                            </label>
                            <div className="relative">
                                <Input
                                    type={showPassword ? 'text' : 'password'}
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    placeholder="••••••••"
                                    className="h-12 text-lg pl-12"
                                    autoComplete="current-password"
                                    disabled={isLoading}
                                />
                                <Button
                                    type="button"
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="absolute left-2 top-1/2 -translate-y-1/2 h-8 w-8 text-gray-400 hover:text-gray-600"
                                    aria-label={showPassword ? 'إخفاء كلمة المرور' : 'إظهار كلمة المرور'}
                                >
                                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                </Button>
                            </div>
                        </div>

                        {/* Remember Me */}
                        <label className="flex items-center gap-3 cursor-pointer group">
                            <input
                                type="checkbox"
                                checked={rememberMe}
                                onChange={(e) => setRememberMe(e.target.checked)}
                                className="w-5 h-5 rounded border-gray-300 transition-colors"
                                style={{ accentColor: THEME.navy }}
                                disabled={isLoading}
                            />
                            <span className="text-sm text-gray-600 group-hover:text-gray-800 transition-colors">
                                تذكرني لمدة 3 أيام
                            </span>
                        </label>

                        {error && (
                            <div
                                className="p-3 rounded-lg text-sm text-center font-medium bg-destructive/10 text-destructive border border-destructive/30"
                            >
                                {error}
                            </div>
                        )}

                        {/* Submit Button */}
                        <Button
                            type="submit"
                            className="w-full h-12 text-lg font-semibold shadow-lg hover:shadow-xl transition-all duration-300"
                            style={{
                                background: `linear-gradient(135deg, ${THEME.navy} 0%, ${THEME.navy}dd 100%)`,
                                color: 'white',
                            }}
                            disabled={isLoading || !username.trim() || !password}
                        >
                            {isLoading ? (
                                <div className="flex items-center justify-center gap-2">
                                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                    <span>جاري الدخول...</span>
                                </div>
                            ) : (
                                <div className="flex items-center justify-center gap-2">
                                    <LogIn className="w-5 h-5" />
                                    <span>تسجيل الدخول</span>
                                </div>
                            )}
                        </Button>
                    </form>
                </div>

                {/* Bottom info */}
                <div
                    className="px-8 py-4 text-center text-xs text-slate-500"
                    style={{ backgroundColor: `${THEME.navy}08` }}
                >
                    الإصدار 1.0.0 | Mayo Tech © 2026
                </div>
            </motion.div>
        </div >
    );
}
