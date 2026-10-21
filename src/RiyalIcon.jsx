import React from 'react';
import './riyal-icon.css';

export default function RiyalIcon({className = '', label = 'ريال سعودي'}) {
  return <span className={'riyal-icon currency-symbol ' + className} role="img" aria-label={label} />;
}
