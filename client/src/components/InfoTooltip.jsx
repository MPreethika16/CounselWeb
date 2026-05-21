import React from 'react';

const InfoTooltip = ({ text }) => {
  return (
    <span className="info-tooltip-container">
      <span className="info-icon">ⓘ</span>
      <span className="info-tooltip-text">{text}</span>
    </span>
  );
};

export default InfoTooltip;
