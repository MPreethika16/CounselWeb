import { useState, useId } from 'react';

const InfoTooltip = ({ text }) => {
  const [isVisible, setIsVisible] = useState(false);
  const tooltipId = useId();

  const handleKeyDown = (e) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      setIsVisible(!isVisible);
    } else if (e.key === "Escape") {
      setIsVisible(false);
    }
  };

  const handleBlur = () => {
    setIsVisible(false);
  };

  return (
    <span className="info-tooltip-container">
      <span
        className="info-icon"
        role="button"
        tabIndex="0"
        aria-describedby={tooltipId}
        onKeyDown={handleKeyDown}
        onBlur={handleBlur}
        onClick={() => setIsVisible(!isVisible)}
        style={{ cursor: "pointer" }}
      >
        ⓘ
      </span>
      <span
        id={tooltipId}
        className="info-tooltip-text"
        role="tooltip"
        aria-hidden={!isVisible}
        style={{
          visibility: isVisible ? "visible" : undefined,
          opacity: isVisible ? 1 : undefined,
          transform: isVisible ? "translateX(-50%) translateY(0)" : undefined
        }}
      >
        {text}
      </span>
    </span>
  );
};

export default InfoTooltip;
