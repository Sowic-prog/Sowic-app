import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { User, Lock, AlertCircle } from 'lucide-react';
import logoIcon from '../assets/logo-icon.jpg';
import logoText from '../assets/logo-text.png';

const Login: React.FC = () => {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState<string | null>(null);
    const navigate = useNavigate();
    const { login, isLoading } = useAuth();

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);

        const success = await login(username, password);
        if (success) {
            navigate('/');
        } else {
            setError('Credenciales inválidas. Intente nuevamente.');
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-slate-100 p-4">
            <div className="bg-white p-8 rounded-2xl shadow-xl w-full max-w-sm border border-slate-200">
                <div className="text-center mb-8">
                    <div className="w-24 h-24 mx-auto mb-2 shadow-md rounded-full overflow-hidden border-4 border-white bg-white">
                        <img src={logoIcon} alt="Logotipo SOWIC" className="w-full h-full object-cover" />
                    </div>
                    <div className="flex justify-center mb-0">
                        <img src={logoText} alt="SOWIC" className="h-28 object-contain" />
                    </div>
                    <p className="text-slate-500 text-sm font-medium uppercase tracking-wide mt-1">Acceso Corporativo</p>
                </div>

                {error && (
                    <div className="mb-6 p-4 bg-red-50 border border-red-100 text-red-600 rounded-xl text-sm flex items-center shadow-sm">
                        <AlertCircle size={18} className="mr-3 flex-shrink-0" />
                        {error}
                    </div>
                )}

                <form onSubmit={handleLogin} className="space-y-5">
                    <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 ml-1">Usuario</label>
                        <div className="relative group">
                            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                <User className="h-5 w-5 text-slate-300 group-focus-within:text-orange-500 transition-colors" />
                            </div>
                            <input
                                type="text"
                                required
                                className="block w-full pl-11 pr-4 py-3 border-none bg-slate-50 rounded-xl text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-orange-100 focus:bg-white transition-all font-medium"
                                placeholder="usuario"
                                value={username}
                                onChange={(e) => setUsername(e.target.value)}
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 ml-1">Contraseña</label>
                        <div className="relative group">
                            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                <Lock className="h-5 w-5 text-slate-300 group-focus-within:text-orange-500 transition-colors" />
                            </div>
                            <input
                                type="password"
                                required
                                className="block w-full pl-11 pr-4 py-3 border-none bg-slate-50 rounded-xl text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-orange-100 focus:bg-white transition-all font-medium"
                                placeholder="••••••••"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                            />
                        </div>
                    </div>

                    <button
                        type="submit"
                        disabled={isLoading}
                        className="w-full flex justify-center py-3.5 px-4 border border-transparent rounded-xl shadow-lg shadow-orange-200 text-sm font-bold text-white bg-orange-600 hover:bg-orange-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500 disabled:opacity-70 disabled:cursor-not-allowed transition-all active:scale-[0.98] mt-4"
                    >
                        {isLoading ? 'Verificando...' : 'Iniciar Sesión'}
                    </button>
                </form>

                <div className="mt-8 text-center">
                    <p className="text-xs text-slate-400 font-medium">
                        Sistema Privado de Gestión
                    </p>
                </div>
            </div>
        </div>
    );
};

export default Login;
