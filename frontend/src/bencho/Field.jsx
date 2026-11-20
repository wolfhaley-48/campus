import { useEffect, useId, useLayoutEffect, useRef, useState } from "react";
import { Eye, EyeOff } from "../icons";

import "./Field.css";

/*
  Адаптация Bencho LabelInput (MIT, bencho.dev): поле с поднимающейся
  подписью и разрывом в верхней линии. Отличия от оригинала: подпись
  на русском, управляемое значение, произвольный type, ширина по
  контейнеру и сообщение об ошибке.
*/

const HEIGHT = 54;
const LABEL_SCALE = 0.76;
const INSET = 0.75;

export function Field({
  label,
  type = "text",
  value = "",
  onChange,
  name,
  autoComplete = "off",
  error,
  hint,
  disabled = false,
  inputMode,
  required = false,
}) {
  const id = `bfield-${useId().replace(/:/g, "")}`;
  const rootRef = useRef(null);
  const labelRef = useRef(null);
  const [focus, setFocus] = useState(false);
  const [show, setShow] = useState(false);
  const [width, setWidth] = useState(300);
  const [labelWidth, setLabelWidth] = useState(52);

  const secret = type === "password";
  const up = focus || value.length > 0;
  const radius = HEIGHT / 2;
  const left = Math.max(16, radius + 6);

  useLayoutEffect(() => {
    const measure = () => {
      if (rootRef.current) setWidth(rootRef.current.clientWidth || 300);
      if (labelRef.current) setLabelWidth(labelRef.current.offsetWidth || 52);
    };
    measure();

    const observer = new ResizeObserver(measure);
    if (rootRef.current) observer.observe(rootRef.current);
    if (document.fonts?.ready) {
      document.fonts.ready.then(measure).catch(() => {});
    }
    return () => observer.disconnect();
  }, [label]);

  useEffect(() => {
    setShow(false);
  }, [type]);

  const w = Math.max(width, 220);
  const h = HEIGHT;
  const r = radius;
  const R = w - INSET;
  const B = h - INSET;
  const arc = r - INSET;
  const x0 = Math.max(r * 0.4, left - 5);
  const x1 = Math.min(w - 16, left + labelWidth * LABEL_SCALE + 5);
  const mid = w / 2;
  const notchMid = (x0 + x1) / 2;

  const gapLeft = `M${notchMid},${INSET} L${x0},${INSET}`;
  const gapRight = `M${notchMid},${INSET} L${x1},${INSET}`;
  const right = `M${x1},${INSET} L${w - r},${INSET} A${arc},${arc} 0 0 1 ${R},${r} L${R},${B - r} A${arc},${arc} 0 0 1 ${w - r},${B} L${mid},${B}`;
  const leftPath = `M${x0},${INSET} L${r},${INSET} A${arc},${arc} 0 0 0 ${INSET},${r} L${INSET},${B - r} A${arc},${arc} 0 0 0 ${r},${B} L${mid},${B}`;

  return (
    <div
      className="bfield"
      ref={rootRef}
      data-up={up ? "true" : undefined}
      data-focus={focus ? "true" : undefined}
    >
      <div className="bfield-box" style={{ height: h, borderRadius: r }}>
        <svg
          className="bfield-ring"
          width={w}
          height={h}
          viewBox={`0 0 ${w} ${h}`}
          aria-hidden="true"
        >
          <path d={right} />
          <path d={leftPath} />
          <path className="bfield-gap" d={gapLeft} pathLength={1} />
          <path className="bfield-gap" d={gapRight} pathLength={1} />
        </svg>

        <label
          className="bfield-label"
          htmlFor={id}
          ref={labelRef}
          style={{ "--field-x": `${left}px` }}
        >
          {[...label].map((char, index) => (
            <span key={`${char}-${index}`} style={{ "--i": index }}>
              {char}
            </span>
          ))}
        </label>

        <input
          id={id}
          className="bfield-input"
          name={name}
          type={secret ? (show ? "text" : "password") : type}
          value={value}
          onChange={(event) => onChange?.(event.target.value)}
          onFocus={() => setFocus(true)}
          onBlur={() => setFocus(false)}
          autoComplete={autoComplete}
          autoCapitalize="off"
          autoCorrect="off"
          spellCheck={false}
          disabled={disabled}
          inputMode={inputMode}
          required={required}
          aria-invalid={error ? "true" : undefined}
          aria-describedby={error ? `${id}-error` : hint ? `${id}-hint` : undefined}
          style={{ paddingLeft: left, paddingRight: secret ? 48 : 16 }}
        />

        {secret && (
          <button
            type="button"
            className="bfield-eye"
            data-show={show ? "true" : undefined}
            onPointerDown={(event) => event.preventDefault()}
            onClick={() => setShow((current) => !current)}
            aria-label={show ? "Скрыть пароль" : "Показать пароль"}
            tabIndex={0}
          >
            <Eye size={16} strokeWidth={2} aria-hidden="true" />
            <EyeOff size={16} strokeWidth={2} aria-hidden="true" />
          </button>
        )}
      </div>

      {error ? (
        <p className="bfield-error" id={`${id}-error`}>
          {error}
        </p>
      ) : hint ? (
        <p className="bfield-hint" id={`${id}-hint`}>
          {hint}
        </p>
      ) : null}
    </div>
  );
}
