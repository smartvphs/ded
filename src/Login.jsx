import React, {useState,useEffect,useRef} from 'react';
import {EyeOff,ArrowLeft,ChevronRight,LoaderCircle,TriangleAlert} from 'lucide-react';
import {requestLogin,verifyLogin,resendLoginCode,setAuthSession} from './auth-api';
import {LoginArt,LoginHero} from './LoginArt';
import './login.css';

function normalizeCode(value) {
  return value.replace(/[٠-٩]/g,c=>String(c.charCodeAt(0)-1632)).replace(/[۰-۹]/g,c=>String(c.charCodeAt(0)-1776)).replace(/[^0-9]/g,'').slice(0,6);
}

export default function Login({onLogin}) {
  const [email,setEmail]=useState(''),[password,setPassword]=useState(''),[visible,setVisible]=useState(false);
  const [error,setError]=useState(''),[fieldErrors,setFieldErrors]=useState({}),[busy,setBusy]=useState(false);
  const [challengeId,setChallengeId]=useState(null),[challenge,setChallenge]=useState(null),[digits,setDigits]=useState(Array(6).fill(''));
  const [now,setNow]=useState(Date.now()),[notice,setNotice]=useState(''),[resending,setResending]=useState(false);
  const digitRefs=useRef([]);
  const otp=Boolean(challengeId);
  useEffect(()=>{
    if(!challengeId)return;
    setNow(Date.now());
    digitRefs.current[0]?.focus();
    const timer=setInterval(()=>setNow(Date.now()),1000);
    return()=>clearInterval(timer);
  },[challengeId]);
  const expiration=challenge?.expiresAt?Date.parse(challenge.expiresAt):NaN;
  const remaining=Number.isFinite(expiration)?Math.max(0,Math.ceil((expiration-now)/1000)):null;
  const expired=remaining===0;
  const resendTime=challenge?.resendAvailableAt?Date.parse(challenge.resendAvailableAt):NaN;
  const resendWait=Number.isFinite(resendTime)?Math.max(0,Math.ceil((resendTime-now)/1000)):0;
  const resendExhausted=challenge?.resendsRemaining===0;

  function enterDigits(value,index) {
    const normalized=normalizeCode(value);
    setError('');setNotice('');
    if(!normalized){setDigits(previous=>previous.map((digit,i)=>i===index?'':digit));return;}
    const start=normalized.length===6?0:index;
    setDigits(previous=>{const next=[...previous];for(let i=0;i<normalized.length&&start+i<6;i++)next[start+i]=normalized[i];return next;});
    digitRefs.current[Math.min(start+normalized.length,5)]?.focus();
  }
  function back() {
    if(busy)return;
    setChallengeId(null);setChallenge(null);setDigits(Array(6).fill(''));setError('');setFieldErrors({});setNotice('');
  }
  async function resend() {
    if(busy||resendWait>0||resendExhausted)return;
    setResending(true);setBusy(true);setError('');setNotice('');
    try{
      const result=await resendLoginCode(challengeId);
      setChallenge(previous=>({...previous,...Object.fromEntries(Object.entries(result).filter(([,value])=>value!==undefined)),resendsRemaining:result.resendsRemaining??(Number.isInteger(previous?.resendsRemaining)?Math.max(0,previous.resendsRemaining-1):null),expiresAt:result.expiresAt??null,resendAvailableAt:result.resendAvailableAt??new Date(Date.now()+60000).toISOString()}));
      setChallengeId(result.challengeId);setNow(Date.now());setDigits(Array(6).fill(''));setNotice('تم إعادة إرسال رمز التحقق.');
    }catch(err){setError(err.message||'تعذر إعادة إرسال رمز التحقق.');}
    finally{setBusy(false);setResending(false);requestAnimationFrame(()=>digitRefs.current[0]?.focus());}
  }
  async function submit(event) {
    event.preventDefault();
    if(busy)return;
    setNotice('');setError('');
    if(!otp){
      const invalid={};
      if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim()))invalid.email='البريد المدخل غير صحيح';
      if(!password)invalid.password='أدخل الرقم السري';
      setFieldErrors(invalid);
      if(Object.keys(invalid).length)return;
    }else{
      if(expired){setError('انتهت صلاحية رمز التحقق. اطلب رمزًا جديدًا.');return;}
      if(digits.some(digit=>!digit)){setError('أدخل رمز التحقق كاملًا.');digitRefs.current[digits.findIndex(digit=>!digit)]?.focus();return;}
    }
    setBusy(true);
    try{
      if(!otp){
        const result=await requestLogin(email.trim(),password);
        setChallenge(result);setNow(Date.now());setChallengeId(result.challengeId);setPassword('');setVisible(false);setDigits(Array(6).fill(''));
      }else{
        const session=await verifyLogin(challengeId,digits.join(''));
        setAuthSession(session);setDigits(Array(6).fill(''));onLogin(session);
      }
    }catch(err){setError(err.message||'تعذر تسجيل الدخول. حاول مرة أخرى.');}
    finally{setBusy(false);}
  }

  return <div className={'login-page '+(otp?'login-otp-page':'')}>
    <LoginHero/>
    <main className={'login-main '+(error?'has-error':'')}>
      {otp&&<button type="button" className="login-back" aria-label="الرجوع لتسجيل الدخول" onClick={back} disabled={busy}><span><ChevronRight size={20}/></span>رجوع</button>}
      <LoginArt name={otp?'logoVerify':'logo'} className="login-logo" label="MY PART — ماي بارت"/>
      <section className={'login-content '+(otp?'login-verify-content':'')} aria-labelledby="login-title">
        {otp&&<LoginArt name="badge" className="login-symbol"/>}
        <h2 id="login-title">{otp?'رمز التحقق':'سجل الآن..'}</h2>
        <p className="login-intro">{otp?<>قم بإدخال الرمز المرسل إلى <span className="otp-contact" dir="ltr">{challenge?.maskedEmail||email.trim()}</span></>:'أدخل بريدك الإلكتروني وكلمة السر ليصلك رمز التحقق'}</p>
        <form onSubmit={submit} noValidate aria-busy={busy}>
          {!otp?<>
            <label className={'login-field '+(fieldErrors.email?'invalid':'')}>
              <span>البريد الإلكتروني</span>
              <span className="login-control"><LoginArt name="mail" className="login-field-icon"/><input type="email" name="email" autoComplete="username" aria-label="البريد الإلكتروني" placeholder="ادخل البريد الإلكتروني" value={email} onChange={event=>{setEmail(event.target.value);setFieldErrors(previous=>({...previous,email:''}));setError('');}} required dir="ltr" disabled={busy} aria-invalid={Boolean(fieldErrors.email)} aria-describedby={fieldErrors.email?'email-error':undefined}/></span>
              {fieldErrors.email&&<span id="email-error" className="login-field-error" role="alert">{fieldErrors.email}</span>}
            </label>
            <label className={'login-field '+(fieldErrors.password?'invalid':'')}>
              <span>الرقم السري</span>
              <span className="login-control"><LoginArt name="lock" className="login-field-icon"/><input type={visible?'text':'password'} name="password" autoComplete="current-password" aria-label="الرقم السري" placeholder="ادخل كلمة السر" value={password} onChange={event=>{setPassword(event.target.value);setFieldErrors(previous=>({...previous,password:''}));setError('');}} required disabled={busy} aria-invalid={Boolean(fieldErrors.password)} aria-describedby={fieldErrors.password?'password-error':undefined}/><button type="button" aria-label={visible?'إخفاء كلمة المرور':'إظهار كلمة المرور'} disabled={busy} onClick={()=>setVisible(!visible)}>{visible?<EyeOff size={20}/>:<LoginArt name="eye"/>}</button></span>
              {fieldErrors.password&&<span id="password-error" className="login-field-error" role="alert">{fieldErrors.password}</span>}
            </label>
            <p className="login-channel-note">سيتم إرسال رمز التحقق الخاص بك عبر <span>البريد الإلكتروني</span></p>
            {error&&<p className="login-error" role="alert">{error}</p>}
          </>:<div className={'otp-digits '+(error?'otp-invalid':'')} role="group" aria-label="رمز التحقق" dir="ltr" onPaste={event=>{const pasted=normalizeCode(event.clipboardData.getData('text'));if(pasted){event.preventDefault();enterDigits(pasted,0);}}}>
            {digits.map((digit,index)=><input key={index} ref={element=>{digitRefs.current[index]=element;}} name={'otp-'+index} type="text" inputMode="numeric" autoComplete={index===0?'one-time-code':'off'} aria-label={'الرقم '+(index+1)+' من رمز التحقق'} value={digit} maxLength={6} disabled={busy} onChange={event=>enterDigits(event.target.value,index)} onFocus={event=>event.target.select()} onKeyDown={event=>{if(event.key==='Backspace'&&!digit&&index>0){event.preventDefault();setDigits(previous=>previous.map((value,i)=>i===index-1?'':value));digitRefs.current[index-1]?.focus();}if(event.key==='ArrowLeft'&&index>0){event.preventDefault();digitRefs.current[index-1]?.focus();}if(event.key==='ArrowRight'&&index<5){event.preventDefault();digitRefs.current[index+1]?.focus();}}}/>)}
          </div>}
          <button className="login-submit" type="submit" disabled={busy||(otp&&expired)}>{busy?<><LoaderCircle className="auth-spinner" size={19}/>{resending?'جارٍ إعادة الإرسال...':otp?'جارٍ التحقق...':'جارٍ تسجيل الدخول...'}</>:<>{otp?'متابعة':'تسجيل دخول'}<ArrowLeft size={20}/></>}</button>
          {otp&&<div className="otp-status" aria-live="polite">
            {error||expired||resendWait===0?<p className="otp-resend">لم يصلك الرمز؟ <button type="button" onClick={resend} disabled={busy||resendWait>0||resendExhausted}>{resendExhausted?'نفدت محاولات إعادة الإرسال':resending?'جارٍ الإرسال...':'إعادة إرسال'}</button>{resendWait>0&&<b>({resendWait} ثانية)</b>}</p>:remaining!==null&&<p className="otp-expiry">متبقي للرمز <b>{remaining} ثانية</b></p>}
            {notice&&<p className="otp-notice" role="status">{notice}</p>}
          </div>}
        </form>
      </section>
      {otp&&error&&<p className="login-error-toast" role="alert"><TriangleAlert size={18} fill="white"/>{error}</p>}
      <footer className="login-footer"><div className="login-legal"><span>شروط الاستخدام</span><i>·</i><span>سياسة الخصوصية</span></div><p>جميع الحقوق محفوظة ©2026 | لقطع غيارك</p></footer>
    </main>
  </div>;
}
