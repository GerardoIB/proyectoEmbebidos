import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { loginUser, registerUser, getCurrentUser, logoutUser } from '../services/auth';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  // Verificar sesión con JWT al iniciar
  useEffect(() => {
    async function checkAuth() {
      const token = localStorage.getItem('ww_jwt_token');
      if (token) {
        try {
          const currentUser = await getCurrentUser();
          setUser(currentUser);
        } catch (err) {
          console.warn('Sesión no válida o expirada:', err.message);
          logoutUser();
          setUser(null);
        }
      } else {
        setUser(null);
      }
      setLoading(false);
    }

    checkAuth();
  }, []);

  // Registro de usuario
  const register = useCallback(async (email, password, name) => {
    const newUser = await registerUser(email, password, name);
    setUser(newUser);
    return newUser;
  }, []);

  // Inicio de sesión
  const login = useCallback(async (email, password) => {
    const loggedUser = await loginUser(email, password);
    setUser(loggedUser);
    return loggedUser;
  }, []);

  // Cerrar sesión
  const logout = useCallback(() => {
    logoutUser();
    setUser(null);
    navigate('/login');
  }, [navigate]);

  // Valor del contexto
  const value = {
    user,
    loading,
    isAuthenticated: !!user,
    register,
    login,
    logout,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth debe usarse dentro de AuthProvider');
  }
  return context;
}

export default AuthContext;