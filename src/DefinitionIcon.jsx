import React, { useId } from 'react';

const heights = { policies:1173, partners:1147, purchases:1147, reviews:1343, why:1254, numbers:1173, banners:1173, ads:1287, ticker:1157 };
const artwork = {
  numbers:['partners',1113,194,22,22], partners:['numbers',1008,194,24,24],
  purchases:['partners',878,194,24,24], reviews:['partners',685,194,24,24], why:['partners',519,194,24,24],
  privacy:['policies',1113,194,24,24,'light'], terms:['policies',858,194,24,24],
  returns:['policies',692,194,24,24], shipping:['policies',447,194,24,24],
  parts:['banners',1111,194,26,26,'light'], oil:['banners',940,194,24,24], tires:['banners',837,194,24,24],
  care:['banners',734,194,24,24], accessories:['banners',574,194,24,24],
  upload:['partners',575,373,36,36], image:['partners',617,510,18,18,'light'], plus:['partners',150,601,16,16,'light'],
  trash:['why',96,951,24,24], eye:['purchases',104,590,20,20],
  star:['reviews',76,335,28,28], starFilled:['reviews',940,867,18,18],
  copyLink:['reviews',417,278,22,22,'raw'],
  fieldParts:['numbers',1077,385,24,24], fieldOrders:['numbers',553,385,24,24],
  fieldVisitors:['numbers',1077,491,24,24], fieldCustomers:['numbers',553,491,24,24],
  person:['reviews',1077,448,24,24], attach:['reviews',553,448,24,24], location:['purchases',553,380,24,24],
  banner:['banners',1101,673,24,24], megaphone:['ticker',1077,315,24,24], link:['ticker',553,416,24,24],
  phone:['ticker',553,315,24,24], support:['ticker',164,633,24,24,'light'],
  language:['ticker',1013,634,20,20,'light'],
  bold:['policies',982,341,16,16], italic:['policies',954,341,16,16], underline:['policies',926,341,16,16],
  alignRight:['policies',862,341,16,16], alignCenter:['policies',834,341,16,16], alignLeft:['policies',806,341,16,16], list:['policies',741,341,16,16],
  trust:['why',971,953,72,72,'raw'], sale:['why',703,953,72,72,'raw'], refund:['why',435,953,72,72,'raw'], truck:['why',167,953,72,72,'raw'],
  watermarkParts:['numbers',877,702,85,90,'watermark'], watermarkOrders:['numbers',604,720,95,70,'watermark'],
  watermarkVisitors:['numbers',332,694,90,98,'watermark'], watermarkCustomers:['numbers',60,725,90,67,'watermark'],
};

export default function DefinitionIcon({name,size=16,className='',style}) {
  const id=useId();
  const [file,x,y,w,h,mode='dark']=artwork[name];
  const matrix=mode==='light' ? '.4252 1.4304 .1444 0 -1' : mode==='watermark' ? '-1.7008 -5.7216 -.5776 0 7.68' : '-.8504 -2.8608 -.2888 0 3.6';
  return <svg width={size} height={size} viewBox={`0 0 ${w} ${h}`} className={'definition-reference-icon '+className} style={style} aria-hidden="true" focusable="false">
    {mode!=='raw'&&<defs><filter id={id} x="0" y="0" width={w} height={h} filterUnits="userSpaceOnUse" colorInterpolationFilters="sRGB"><feColorMatrix type="matrix" values={`0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  ${matrix}`} result="ink"/>{mode==='watermark'&&<feComponentTransfer in="ink" result="ink"><feFuncA type="table" tableValues="0 .1 .2 .3 .4 .5 .6 .7 .8 .9 0"/></feComponentTransfer>}<feFlood floodColor="currentColor" result="color"/><feComposite in="color" in2="ink" operator="in"/></filter></defs>}
    <g filter={mode==='raw'?undefined:`url(#${id})`}><svg width={w} height={h} viewBox={`${x} ${y} ${w} ${h}`}><image href={`/definition-reference/${file}.png`} width="1440" height={heights[file]}/></svg></g>
  </svg>;
}
