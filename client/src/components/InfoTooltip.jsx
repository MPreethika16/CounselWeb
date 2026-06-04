import { useState, useId, useEffect, useRef } from 'react';

const InfoTooltip = ({ text }) => {
  const [isVisible, setIsVisible] = useState(false);
  const [hoverCapable, setHoverCapable] = useState(false);
  const tooltipId = useId();
  const containerRef = useRef(null);

  useEffect(() => {
    const mq = window.matchMedia("(hover: hover) and (pointer: fine)");
    setHoverCapable(mq.matches);
    const onChange = (e) => setHoverCapable(e.matches);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  useEffect(() => {
    if (!isVisible) return;

    const handleOutsideClick = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setIsVisible(false);
      }
    };

    document.addEventListener("mousedown", handleOutsideClick);
    document.addEventListener("touchstart", handleOutsideClick);
    return () => {
      document.removeEventListener("mousedown", handleOutsideClick);
      document.removeEventListener("touchstart", handleOutsideClick);
    };
  }, [isVisible]);

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

  const show = isVisible;

  return (
    <span
      ref={containerRef}
      className="info-tooltip-container"
      onMouseEnter={() => hoverCapable && setIsVisible(true)}
      onMouseLeave={() => hoverCapable && setIsVisible(false)}
    >
      <span
        className="info-icon"
        role="button"
        tabIndex="0"
        aria-describedby={tooltipId}
        aria-expanded={show}
        onKeyDown={handleKeyDown}
        onBlur={handleBlur}
        onClick={() => {
          if (!hoverCapable) setIsVisible((v) => !v);
        }}
        style={{ cursor: "pointer" }}
      >
        ⓘ
      </span>
      <span
        id={tooltipId}
        className={`info-tooltip-text${show ? " is-visible" : ""}`}
        role="tooltip"
        aria-hidden={!show}
      >
        {text}
      </span>
    </span>
  );
};

export default InfoTooltip;
