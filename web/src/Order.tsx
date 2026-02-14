import { useState, useRef, useEffect } from "react";
import stampIcon from "./assets/stamp.png";
import scratchImg from "./assets/scratch.png";

import mysteryIcon from "./assets/drinks/mysteryIcon.png";
import latteIcon from "./assets/drinks/latteIcon.png";
import americanoIcon from "./assets/drinks/americanoIcon.png";
import matchaIcon from "./assets/drinks/matchaIcon.png";
import hotDrinkIcon from "./assets/drinks/hotCoffeeIcon.png";

import bunny from "./assets/captcha/captcha-bunny.png"
import cat from "./assets/captcha/captcha-cat.png"
import headset from "./assets/captcha/captcha-headset.png"
import heart from "./assets/captcha/captcha-heart.png"
import miffy from "./assets/captcha/captcha-miffy.png"
import suitcase from "./assets/captcha/captcha-suitcase.png"

type CaptchaIcon = {
  src: string;
  x: number;
  y: number;
}

export default function Order() {
  const [name, setName] = useState("");
  const [drink, setDrink] = useState<"latte"|"americano"|"matcha"|null>(null);
  const [temp, setTemp] = useState<"hot"|"cold">("hot");
  const [oatMilk, setOatMilk] = useState(false);
  const [extraShot, setExtraShot] = useState(false);

  const [stampPos, setStampPos] = useState<{x: number, y: number} | null>(null);
  // const stampIcon = require("./assets/stamp.png");

  // const mysteryIcon = require("./assets/drinks/mysteryIcon.png");
  // const hotDrinkIcon = require("./assets/drinks/hotCoffeeIcon.png");
  // const drinkIcons = {
  //   latte: require("./assets/drinks/latteIcon.png"),
  //   americano: require("./assets/drinks/americanoIcon.png"),
  //   matcha: require("./assets/drinks/matchaIcon.png"),
  // };
   const drinkIcons = {
    latte: latteIcon,
    americano: americanoIcon,
    matcha: matchaIcon,
  };
  const currentDrinkIcon = !drink
    ? mysteryIcon
    : temp === "hot"
    ? hotDrinkIcon
    : drinkIcons[drink];

  const SCRATCHER_POSITION = { x: 264, y: 1201 };
  const SCRATCHER_WIDTH = 103;
  // const SCRATCHER_HEIGHT = 49;
  // const scratchImg = require("./assets/scratch.png");
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const scratchContainerRef = useRef<HTMLDivElement | null>(null);
  const [scratcherPos, setScratcherPos] = useState(SCRATCHER_POSITION);
  const [dragging, setDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [submitted, setSubmitted] = useState(false);

  const CAPTCHA_WIDTH = 220;
  const CAPTCHA_HEIGHT = 227;
  const ICON_SIZE = 52;
  const [captchaIcons, setCaptchaIcons] = useState<CaptchaIcon[]>([]);
  const [targetIcons, setTargetIcons] = useState<string[]>([]);
  const [selectedIndexes, setSelectedIndexes] = useState<number[]>([]);
  const [showCaptcha, setShowCaptcha] = useState(false);
  const [captchaMessage, setCaptchaMessage] = useState("");
  const iconPool = [ bunny, cat, headset, heart, miffy, suitcase];

  const toggleTemp = () => setTemp(prev => prev === "hot" ? "cold" : "hot");

  const generateCaptcha = () => {
    const shuffled = [...iconPool].sort(() => 0.5 - Math.random());
    const targets = shuffled.slice(0,3);
    const icons: string[] = [];
    targets.forEach(t => icons.push(t));
    while(icons.length < 9){
      const randomIcon =
        iconPool[Math.floor(Math.random() * iconPool.length)];
      icons.push(randomIcon);
    }
    const placed: CaptchaIcon[] = [];
    icons.forEach(icon => {
      let placedSuccessfully = false;
      let attempts = 0;
      while(!placedSuccessfully && attempts < 100){
        const x = Math.random() * (CAPTCHA_WIDTH - ICON_SIZE);
        const y = Math.random() * (CAPTCHA_HEIGHT - ICON_SIZE);
        const overlaps = placed.some(p => {
          const dx = p.x - x;
          const dy = p.y - y;
          const distance = Math.sqrt(dx * dx + dy * dy);
          return distance < ICON_SIZE * 0.85;
        });
        if(!overlaps){
          placed.push({ src: icon, x, y });
          placedSuccessfully = true;
        }
        attempts++
      }
    });
    setTargetIcons(targets);
    setCaptchaIcons(placed);
    setSelectedIndexes([]);
    setShowCaptcha(true);
  }
  const toggleSelect = (index: number) => {
    setSelectedIndexes(prev =>
      prev.includes(index)
      ? prev.filter(i => i !== index)
      : [...prev, index]
    );
  };
  const getCorrectIndexes = () => {
    return captchaIcons
      .map((icon, i) => targetIcons.includes(icon.src) ? i : null)
      .filter((i): i is number => i !== null);
  };
  const failCaptcha = () => {
    setCaptchaIcons([]);
    setSelectedIndexes([]);
    setCaptchaMessage("no. do it again");
    setTimeout(() => {
      closeCaptcha();
    }, 800)
  }
  const verifyCaptcha = () => {
    const correctIndexes = getCorrectIndexes();
    const isCorrect = 
      selectedIndexes.length === correctIndexes.length &&
      selectedIndexes.every(i => correctIndexes.includes(i));
    if(isCorrect){
      setExtraShot(true);
      closeCaptcha();
    } else {
      failCaptcha();
    }
  };
  const closeCaptcha = () => {
    setShowCaptcha(false);
    setCaptchaIcons([]);
    setSelectedIndexes([]);
    setTargetIcons([]);
    setCaptchaMessage("")
  };
  useEffect(() => {
    if(!showCaptcha) return;
    const correctIndexes = getCorrectIndexes();
    const hasWrongSelection = selectedIndexes.some(i => !correctIndexes.includes(i));
    if(hasWrongSelection){
      failCaptcha();
      return;
    }
    if(selectedIndexes.length === correctIndexes.length && correctIndexes.length > 0) {
      setTimeout(() => {
        verifyCaptcha();
      }, 150);
    }
  }, [selectedIndexes, captchaIcons, targetIcons, showCaptcha]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if(!canvas) return;
    const container = canvas.parentElement!;
    const rect = container.getBoundingClientRect();
    canvas.width = rect.width;
    canvas.height = rect.height;
    const ctx = canvas.getContext("2d");
    if(!ctx) return;
    const img = new Image();
    img.src = scratchImg
    img.onload = () => {
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    };
  },[])

  const startDrag = (e: React.MouseEvent | React.TouchEvent) => {
      e.preventDefault();
      const container = scratchContainerRef.current;
      if(!container) return;
      const rect = container.getBoundingClientRect();
      let clientX: number;
      let clientY: number;
      if("touches" in e){
        clientX = e.touches[0].clientX;
        clientY = e.touches[0].clientY;
      } else {
        clientX = e.clientX;
        clientY = e.clientY;
      }
      setDragOffset({
        x: clientX - rect.left - scratcherPos.x,
        y: clientY - rect.top - scratcherPos.y,
      })
      setDragging(true);
    }
  
    const endDrag = (e: React.MouseEvent | React.TouchEvent) => {
      e.preventDefault();
      setDragging(false);
    }

  useEffect(() => {
    const move = (e: MouseEvent | TouchEvent) => {
      if(!dragging) return;
      e.preventDefault();
      const container = scratchContainerRef.current;
      const canvas = canvasRef.current;
      if(!container || !canvas) return;
      let clientX: number;
      let clientY: number;
      if("touches" in e){
        clientX = e.touches[0].clientX;
        clientY = e.touches[0].clientY;
      } else {
        clientX = e.clientX;
        clientY = e.clientY;
      }
      const containerRect = container.getBoundingClientRect();
      const newX = clientX - containerRect.left - dragOffset.x;
      const newY = clientY - containerRect.top - dragOffset.y;
      setScratcherPos({ x: newX, y: newY });
      const canvasRect = canvas.getBoundingClientRect();
      const x = clientX - canvasRect.left + SCRATCHER_WIDTH/3 - dragOffset.x;
      const y = clientY - canvasRect.top;
      scratchAt(x, y);
    }
    window.addEventListener("mousemove", move);
    window.addEventListener("touchmove", move);
    return () => {
      window.removeEventListener("mousemove", move);
      window.removeEventListener("touchmove", move);
    };
  }, [dragging, dragOffset])
  const isScratchedEnough = (threshold = 0.9) => {
    const canvas = canvasRef.current;
    if(!canvas) return false;
    const ctx = canvas.getContext("2d");
    if(!ctx) return false;
    const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const pixels = imgData.data;
    let transparentPixels = 0;
    for(let i=3; i<pixels.length; i+=4){
      if(pixels[i] === 0) transparentPixels++;
    }
    const clearedRatio = transparentPixels/(pixels.length/4);
    return clearedRatio >= threshold;
  }
  const scratchAt = (x: number, y: number) => {
    if(submitted) return;
    const canvas = canvasRef.current;
    if(!canvas) return;
    const ctx = canvas.getContext("2d");
    if(!ctx) return;
    ctx.globalCompositeOperation = "destination-out";
    ctx.beginPath();
    ctx.arc(x, y, 20, 0, Math.PI*2);
    ctx.fill();
    ctx.globalCompositeOperation = "source-over";
    if(isScratchedEnough(0.9)){
      setSubmitted(true);
      setDragging(false);
      setDragOffset({ x: 0, y: 0 });
      handleSubmit();
      ctx.clearRect(0,0, canvas.width, canvas.height);
      setTimeout(() => {
        setScratcherPos(SCRATCHER_POSITION);
        setSubmitted(false);
        const img = new Image();
        img.src = scratchImg;
        img.onload = () => {
          ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        };
      }, 500);
    }
  }

  const handleSubmit = async () => {
    if(!name) {
      alert("who do u think u r");
      return;
    }
    if(!drink) {
      alert("u forgot to order a drink dummy");
      return;
    }
    const order = { 
      name, 
      drink, 
      temp, 
      milk: oatMilk ? "oat milk" : "no milk",
      extraShot,
      createdAt: Date.now()
    };
    try {
      const res = await fetch(`${window.location.origin}/tickets`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(order),
      });
      const data = await res.json().catch(() => null);
      if(data?.ok){
        alert(`order submitted for ${name}, ${temp === "cold" ? "iced" : temp} ${drink}`);
        setName("");
      } else {
        console.error("server error:", data);
        alert("error double check ur answers");
      }
    } catch (err) {
      console.log(err);
      alert("oops, ok it was my fault this time")
    }
  };

  return (
  <div className="wrapper">
    <div className="container">

    <div className="name-container">
      <div className="comment">is this the krusty krab?</div>
      <div className="bunny"></div>
      <input 
        className="input"
        value={name}
        onChange={e => setName(e.target.value)}
        placeholder="no this is.."
      />
      <div className="cat"></div>
    </div>

    <div className="order-container">
      <div className="speech-bubble">
        <p>what do you want from me .</p>
      </div>
      <div className="drink-options">
        {["latte", "americano", "matcha"].map(d => (
          <button
            key={d}
            className={`button ${drink === d ? "buttonSelected" : ""}`}
            onClick={() => setDrink(d as any)}
          >{d}</button>
        ))}
      </div>
    </div>

    <div className="drink-container">
      <div className="options-container">
        <div className="temp-container">
          <button className={`temp-button ${temp === "hot" ? "hot" : ""}`} onClick={toggleTemp}></button>
          <div className={`temp-option-hot ${temp === "hot" ? "tempSelected" : ""}`}>hot</div>
          <div className={`temp-option-cold ${temp === "cold" ? "tempSelected" : ""}`}>cold</div>
        </div>
        <div 
          className="milk-container"
          onClick={(e) => {
            const rect = (e.currentTarget as HTMLDivElement).getBoundingClientRect();
            const x = e.clientX - rect.left;
            const y = e.clientY - rect.top;
            setStampPos({ x, y });
            setOatMilk(true);
          }}
        >
          {stampPos && (
            <div
              style={{
                position: "absolute",
                left: stampPos.x-30,
                top: stampPos.y -32,
                width: "60px",
                height: "64px",
                backgroundImage: `url(${stampIcon})`,
                backgroundSize: "cover",
                pointerEvents: "none",
              }}
            />
          )}
        </div>
        <div className="shot-container">
          <button 
            className="shot-button"
            onClick={() => {if(!extraShot) generateCaptcha();}}
          >shoot me</button>
          {extraShot && (
          <div className="shot-added">
            <div className="shot-button added">pew pew</div>
            <div className="angel"></div>
            <button className="undo" onClick={() => setExtraShot(false)}></button>
          </div>
          )}
        </div>
        {showCaptcha && (
          <div className="captcha-container">
            <div className="captcha-header-container">
              <div className="captcha-header-star" />
              <div className="captcha-header">captcha</div>
              <div className="captcha-header-star" />
            </div>
            <div className="captcha-targets">
              {targetIcons.map((icon, i) => (
                <img key={i} src={icon} className="captcha-icon large" />
              ))}
            </div>
            <div 
              className="captcha-area"
              style={{
                position: "relative",
                width: CAPTCHA_WIDTH,
                height: CAPTCHA_HEIGHT,
              }}
            >
              {captchaIcons.map((icon, i) => (
                <img
                  key={i}
                  src={icon.src}
                  className={`captcha-icon ${
                    selectedIndexes.includes(i) ? "selected" : ""
                  }`}
                  style={{
                    position: "absolute",
                    left: icon.x,
                    top: icon.y,
                    width: ICON_SIZE,
                    height: ICON_SIZE,
                  }}
                  onClick={() => toggleSelect(i)}
                />
              ))}
              {captchaMessage && (
                <div className="captcha-message">{captchaMessage}</div>
              )}
            </div>
            <div className="captcha-close">
              <button className="close-button" onClick={closeCaptcha}>close</button>
            </div>
          </div>
        )}
      </div>
      <div className="preview-container">
        <img 
          src={currentDrinkIcon} 
          alt="drink image" 
          className="drink-image" 
        />
        <div className="drink-sticker">
          {drink ? (
            <>
              <div className="sticker-temp">{temp === "cold" ? "iced" : temp}</div>
              <div className="sticker-drink">{drink}</div>
              {oatMilk && (
                <div className="sticker-milk">+ oat milk</div>
              )}
              {extraShot && (
                <div className="sticker-shot">+ extra shot</div>
              )}
            </>
          ) : (
            <div className="sticker-mystery">???</div>
          )}
          
          <div className="sticker-name">{name}</div>
        </div>
      </div>
    </div>

    <div className="submit-container">
      <div ref={scratchContainerRef} className="scratch-container">
        <canvas ref={canvasRef} className="scratch-canvas" />
      </div>
      <div 
        className="scratcher"
        style={{ 
          left: scratcherPos.x,
          top: scratcherPos.y, 
          cursor: dragging ? "grabbing" : "grab"
        }}
        onMouseDown={startDrag}
        onMouseUp={endDrag}
        onTouchStart={startDrag}
        onTouchEnd={endDrag}
        ></div>
    </div>

    </div>
  </div>
  )
}