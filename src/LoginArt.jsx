import React, {useId} from 'react';

const art = {
  logo:['login',884,80,466,238,'color'], logoVerify:['login',884,80,466,238,'color'],
  badge:['verify',1095,372,48,48],
  mail:['login',1284,480,24,24,'ink'], lock:['login',1284,572,24,24,'ink'],
  eye:['login',934,572,24,24,'ink'],
};

export function LoginArt({name,className='',label}) {
  const id=useId();
  const [file,x,y,w,h,mode]=art[name];
  return <svg className={'login-art '+className} viewBox={`0 0 ${w} ${h}`} role={label?'img':undefined} aria-label={label} aria-hidden={label?undefined:true} focusable="false">
    {mode&&<defs><filter id={id} x="0" y="0" width={w} height={h} filterUnits="userSpaceOnUse" colorInterpolationFilters="sRGB"><feColorMatrix type="matrix" values={mode==='color'?'1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  -.8504 -2.8608 -.2888 0 3.68':'0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  -.8504 -2.8608 -.2888 0 3.6'} result="ink"/>{mode==='ink'&&<><feFlood floodColor="currentColor" result="color"/><feComposite in="color" in2="ink" operator="in"/></>}</filter></defs>}
    <g filter={mode?`url(#${id})`:undefined}><svg width={w} height={h} viewBox={`${x} ${y} ${w} ${h}`}><image href={`/login-reference/${file}.png`} width="1440" height="939"/></svg></g>
  </svg>;
}

export function LoginHero() {
  const id=useId();
  return <aside className="login-brand-panel"><svg className="login-hero-art" viewBox="40 69 697 840" preserveAspectRatio="xMidYMax slice" aria-hidden="true"><defs><linearGradient id={id+'-fade'} x1="0" y1="0" x2="0" y2="1"><stop offset="43%" stopColor="white" stopOpacity="0"/><stop offset="56%" stopColor="white" stopOpacity="1"/></linearGradient><mask id={id+'-mask'} x="40" y="69" width="697" height="840" maskUnits="userSpaceOnUse"><rect x="40" y="69" width="697" height="840" fill={`url(#${id}-fade)`}/></mask></defs><image href="/login-reference/login.png" width="1440" height="939" mask={`url(#${id}-mask)`}/></svg><div className="login-brand-copy"><h1>مرحبا بك فى لوحة تحكم<br/>الأدمن</h1><p>ادارة تحكم تتحكم في كل شئ<br/>من هنا يمكنك ادارة الموظفين ... تحديد الصلاحيات<br/>ومتابعة جميع العمليات داخل النظام</p></div></aside>;
}
