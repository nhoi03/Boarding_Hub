import { useEffect, useState } from 'react';
import { Link, Navigate, useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowLeft, ArrowRight, ShieldCheck } from 'lucide-react';
import { PublicHeader } from './Marketplace';
import { Brand } from './ui';
import type { ThemeControls } from './ui';
import { api } from './api';
import { accountHome, authError, useAuth } from './auth';
import hero from './assets/rental-hero.webp';

export default function AccountPage({controls,register=false}:{controls:ThemeControls;register?:boolean}) {
  const {user,loading,login} = useAuth();
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const [busy,setBusy] = useState(false);
  const [error,setError] = useState('');
  const [registered,setRegistered] = useState(false);
  const [values,setValues] = useState({fullName:'',email:'',password:'',confirm:''});
  const admin = !register && params.get('role') === 'admin';
  const owner = params.get('role') === 'owner';
  useEffect(()=>{
    setRegistered(false); setError('');
    setValues({fullName:'',email:'',password:'',confirm:''});
  },[owner,admin,register]);
  if (loading) return <p className="route-loading" role="status">Đang kiểm tra tài khoản…</p>;
  if (user) return <Navigate to={accountHome(user)} replace />;
  const query = params.toString() ? `?${params}` : '';
  async function submit(event:React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); setError('');
    if (register && values.password !== values.confirm) { setError('Mật khẩu xác nhận không khớp.'); return; }
    if (new TextEncoder().encode(values.password).length > 72) { setError('Mật khẩu tối đa 72 byte UTF-8.'); return; }
    setBusy(true);
    try {
      if (register && !registered) {
        await api.post(owner?'/auth/register-owner':'/auth/register',{fullName:values.fullName.trim(),email:values.email.trim(),password:values.password});
        setRegistered(true);
      }
      const account = await login(values.email.trim(),values.password,owner?'OWNER':admin?'ADMIN':undefined);
      const next = params.get('next');
      // Restrict return navigation to known local routes and the authenticated role.
      const management = /^\/(dashboard|properties|rooms|tenants|assets|utilities|invoices|checkout|maintenance|residence|listings|reports|operations)(?:\?|$)/;
      const allowed = next && (/^\/nguoi-thue(?:\/|\?|$)/.test(next)
        || (account.role !== 'USER' && management.test(next))
        || (account.role === 'ADMIN' && /^\/admin(?:\?|$)/.test(next)));
      navigate(allowed ? next! : accountHome(account),{replace:true});
    } catch (error) { setError(authError(error)); }
    finally { setBusy(false); }
  }
  return <div className="public-shell"><PublicHeader {...controls}/>
    <main className="public-container account-page">
      <div className="account-image"><img src={hero} alt=""/><div><Brand/><p>Tìm phòng và quản lý việc thuê trọ.</p></div></div>
      <section className="account-choices">
        <Link to="/" className="back-link"><ArrowLeft size={16}/> Khám phá phòng</Link>
        <nav className="auth-roles" aria-label="Loại tài khoản">
          <Link to={register?'/register':'/login'} aria-current={!owner&&!admin?'page':undefined}>Người thuê</Link>
          <Link to={`${register?'/register':'/login'}?role=owner`} aria-current={owner?'page':undefined}>Chủ trọ</Link>
          {!register && <Link to="/login?role=admin" aria-current={admin?'page':undefined}>Admin</Link>}
        </nav>
        <h1>{register ? owner?'Đăng ký chủ trọ':'Tạo tài khoản' : owner?'Đăng nhập chủ trọ':admin ? 'Đăng nhập quản trị' : 'Chào mừng trở lại'}</h1>
        <p>{owner?'Mở không gian quản lý phòng, người thuê, hợp đồng và hóa đơn.':register ? 'Đăng ký để mở không gian người thuê của bạn.' : 'Đăng nhập để tiếp tục vào không gian của bạn.'}</p>
        <form className="auth-form" onSubmit={submit}>
          {register && <label>Họ và tên<input name="fullName" autoComplete="name" required maxLength={100} value={values.fullName} onChange={e=>setValues({...values,fullName:e.target.value})}/></label>}
          <label>Email<input name="email" type="email" autoComplete="username" required maxLength={254} value={values.email} onChange={e=>setValues({...values,email:e.target.value})}/></label>
          <label>Mật khẩu<input name="password" type="password" autoComplete={register?'new-password':'current-password'} required minLength={register?8:1} maxLength={72} value={values.password} onChange={e=>setValues({...values,password:e.target.value})}/>{register && <small>Từ 8 ký tự, tối đa 72 byte UTF-8.</small>}</label>
          {register && <label>Xác nhận mật khẩu<input name="confirm" type="password" autoComplete="new-password" required maxLength={72} value={values.confirm} onChange={e=>setValues({...values,confirm:e.target.value})}/></label>}
          {registered && <p className="inline-success" role="status">Đã tạo tài khoản. Nếu đăng nhập chưa thành công, hãy thử lại.</p>}
          {error && <p className="auth-error" role="alert">{error}</p>}
          <button className="ui-button primary" type="submit" disabled={busy} aria-busy={busy}>{busy?'Đang xử lý…':register && !registered?'Đăng ký':'Đăng nhập'}<ArrowRight size={17}/></button>
        </form>
        {(!admin || register) && <p>{register?'Đã có tài khoản?':'Chưa có tài khoản?'} <Link className="quiet-link" to={`${register?'/login':'/register'}${query}`}>{register?'Đăng nhập':owner?'Đăng ký chủ trọ':'Đăng ký ngay'}</Link></p>}
        {!register && <Link className="quiet-link" to={admin?'/login':'/login?role=admin'}><ShieldCheck size={16}/>{admin?'Đăng nhập người dùng':'Dành cho quản trị viên'}</Link>}
      </section>
    </main></div>;
}
