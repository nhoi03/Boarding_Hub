import { createContext, useContext, useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import axios from 'axios';
import { api } from './api';
import { queryClient } from './rental/query';

export type Account = { id:number; fullName:string; email:string; role:'USER'|'OWNER'|'ADMIN'; createdAt:string };
type Auth = {
  user:Account|null; loading:boolean; error:string;
  refresh:()=>Promise<void>;
  login:(email:string,password:string,accountType?:Account['role'])=>Promise<Account>;
  logout:()=>Promise<void>;
};
const Context = createContext<Auth|null>(null);
export const accountHome = (user:Account) => user.role === 'ADMIN' ? '/admin' : user.role === 'OWNER' ? '/dashboard' : '/nguoi-thue';
export function authError(error:unknown) {
  return axios.isAxiosError(error) ? error.response?.data?.message || 'Không kết nối được máy chủ. Vui lòng thử lại.' : error instanceof Error ? error.message : 'Có lỗi xảy ra. Vui lòng thử lại.';
}
export function AuthProvider({children}:{children:ReactNode}) {
  const [user,setUser] = useState<Account|null>(null);
  const [loading,setLoading] = useState(true);
  const [error,setError] = useState('');
  async function refresh() {
    setLoading(true); setError('');
    try { setUser((await api.get<Account>('/auth/me')).data); }
    catch (error) {
      setUser(null);
      if (!axios.isAxiosError(error) || error.response?.status !== 401) setError(authError(error));
    } finally { setLoading(false); }
  }
  useEffect(() => {
    void refresh();
    const expired = () => { queryClient.clear(); setUser(null); };
    window.addEventListener('boardinghub:session-expired',expired);
    return () => window.removeEventListener('boardinghub:session-expired',expired);
  },[]);
  async function login(email:string,password:string,accountType?:Account['role']) {
    const {data} = await api.post<Account>('/auth/login',{email,password,accountType});
    queryClient.clear(); setUser(data); setError(''); return data;
  }
  async function logout() {
    try { await api.post('/auth/logout'); queryClient.clear(); setUser(null); }
    catch (error) {
      if (axios.isAxiosError(error) && error.response?.status === 401) setUser(null);
      else throw error;
    }
  }
  return <Context.Provider value={{user,loading,error,refresh,login,logout}}>{children}</Context.Provider>;
}
export function useAuth() {
  const auth = useContext(Context);
  if (!auth) throw new Error('AuthProvider missing');
  return auth;
}
export function RequireAuth({admin=false,owner=false,children}:{admin?:boolean;owner?:boolean;children:ReactNode}) {
  const {user,loading,error,refresh} = useAuth();
  const location = useLocation();
  if (loading) return <p className="route-loading" role="status">Đang kiểm tra tài khoản…</p>;
  if (error) return <div className="product-panel"><p role="alert">{error}</p><button className="ui-button" onClick={() => void refresh()}>Thử lại</button></div>;
  if (!user) return <Navigate to={`/login?${admin?'role=admin&':owner?'role=owner&':''}next=${encodeURIComponent(location.pathname+location.search)}`} replace />;
  if (admin && user.role !== 'ADMIN') return <Navigate to="/forbidden" replace />;
  if (owner && !['OWNER','ADMIN'].includes(user.role)) return <Navigate to="/forbidden" replace />;
  return <>{children}</>;
}
