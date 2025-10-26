// App.jsx — S-Forecast ver.2.8t (Real-Time 12h Precision+ Nonlinear Edition)
import React, { useEffect, useState } from "react";
import "./App.css";

export default function App() {
  const API_KEY = "8370f7e693e34a79bdd180327252510";

  const CITY = {
    서울:   { name_en: "Seoul",      lat: 37.5665, lon: 126.9780, alt: 20 },
    수원:   { name_en: "Suwon",      lat: 37.2636, lon: 127.0286, alt: 30 },
    용인:   { name_en: "Yongin",     lat: 37.2753, lon: 127.1159, alt: 70 },
    안산:   { name_en: "Ansan",      lat: 37.3219, lon: 126.8309, alt: 15 },
    안양:   { name_en: "Anyang",     lat: 37.3943, lon: 126.9568, alt: 25 },
    강릉:   { name_en: "Gangneung",  lat: 37.7519, lon: 128.8761, alt: 50 },
    부산:   { name_en: "Busan",      lat: 35.1796, lon: 129.0756, alt: 5 },
    오사카: { name_en: "Osaka",      lat: 34.6937, lon: 135.5023, alt: 10 },
    후쿠오카:{ name_en: "Fukuoka",   lat: 33.5902, lon: 130.4017, alt: 20 },
    유후인: { name_en: "Yufuin",     lat: 33.2659, lon: 131.3461, alt: 150 },
    나고야: { name_en: "Nagoya",     lat: 35.1815, lon: 136.9066, alt: 15 },
    마쓰야마:{ name_en: "Matsuyama", lat: 33.8393, lon: 132.7657, alt: 30 },
  };

  const CITY_NAMES = Object.keys(CITY);
  const [city, setCity] = useState("수원");
  const [current, setCurrent] = useState(null);
  const [forecast, setForecast] = useState([]);
  const [hourly, setHourly] = useState([]);
  const [status, setStatus] = useState("로딩 중…");

  const WEEK = ["일","월","화","수","목","금","토"];
  const dayStr = (iso) => {
    const d = new Date(iso);
    const base = d.toLocaleDateString("ko-KR",{month:"short",day:"numeric"});
    return `${base} (${WEEK[d.getDay()]})`;
  };

  const median = (arr) => {
    if (!arr?.length) return 0;
    const s = [...arr].sort((a,b)=>a-b);
    const m = Math.floor(s.length/2);
    return s.length % 2 ? s[m] : (s[m-1]+s[m])/2;
  };

  function rainCorrection(rain, chance) {
    if (rain < 0.1 && chance < 10) return 0;
    return rain;
  }

  async function fetchPoint(lat, lon) {
    const url = `https://api.weatherapi.com/v1/forecast.json?key=${API_KEY}&q=${lat.toFixed(4)},${lon.toFixed(4)}&days=2&aqi=no&alerts=no&lang=ko`;
    const res = await fetch(url);
    if (!res.ok) throw new Error(`API status ${res.status}`);
    const data = await res.json();
    return data;
  }

  // 🔹 S 리듬 계산 (비선형 정밀식)
  function computeSPlus({ temp, humidity, wind = 0, cloud = 0 }) {
    const T0 = 20, H0 = 50;
    const sigmaT = 7, sigmaH = 15;
    const v_c = 10, rho0 = 1.2, kappa = 0.4;

    const ST = Math.exp(-((temp - T0) ** 2) / (2 * sigmaT ** 2));
    const SH = Math.exp(-((humidity - H0) ** 2) / (2 * sigmaH ** 2));
    const SC = 1 - cloud / 100;
    const SV = Math.tanh(wind / v_c);

    const S = rho0 * (ST * SH * SC) - kappa * SV;
    return Math.max(0, Math.min(3, S));
  }

  function refineCondition(text) {
  const t = text.toLowerCase();
  if (t.includes("sunny") || t.includes("clear")) return "맑음";
  if (t.includes("partly") || t.includes("cloud")) return "가끔 구름 많음";
  if (t.includes("overcast")) return "대체로 흐림";
  if (t.includes("rain") && t.includes("snow")) return "비 또는 눈";
  if (t.includes("rain") || t.includes("drizzle") || t.includes("shower")) return "비 또는 소나기";
  if (t.includes("snow") || t.includes("sleet")) return "눈";
  if (t.includes("fog") || t.includes("mist") || t.includes("haze")) return "안개";
  return "기타";
}

  async function fetchWeather(cityKo) {
    try {
      const { name_en, lat, lon } = CITY[cityKo];
      const data = await fetchPoint(lat, lon);

      const nowEpoch = Math.floor(Date.now() / 1000);
      const allHours = data.forecast.forecastday
        .flatMap(day => day.hour)
        .sort((a, b) => a.time_epoch - b.time_epoch);

      // ⏱ 앞으로 12시간만 필터링
      const next12h = allHours
        .filter(h => h.time_epoch >= nowEpoch)
        .slice(0, 12)
        .map(h => {
          const S = computeSPlus({
            temp: h.temp_c,
            humidity: h.humidity,
            wind: h.wind_kph ?? 0,
            cloud: h.cloud ?? 0,
          });
          const rain = rainCorrection(h.precip_mm ?? 0, h.chance_of_rain ?? 0);
          let condition = labelFromS(S);
          if (rain > 0) condition = "비";
          return {
            time: new Date(h.time_epoch * 1000).toLocaleTimeString("ko-KR", {
              hour: "2-digit", minute: "2-digit",
            }),
            temp: h.temp_c,
            humidity: h.humidity,
            condition,
            S,
          };
        });

      const days = data.forecast.forecastday.map(d => ({
        date: d.date,
        maxtemp: d.day.maxtemp_c,
        mintemp: d.day.mintemp_c,
        humidity: d.day.avghumidity,
        condition: d.day.condition.text,
      }));

      setHourly(next12h);
      setForecast(days);
      setCurrent({
        temp_c: data.current.temp_c,
        humidity: data.current.humidity,
        condition: data.current.condition.text,
        last_updated: data.current.last_updated,
        city_en: name_en,
      });
      setStatus("데이터 업데이트 완료");
    } catch (e) {
      console.error(e);
      setStatus("데이터 불러오기 실패");
    }
  }

  useEffect(() => { fetchWeather(city); }, [city]);

  // ====== 렌더링 ======
  return (
    <div className="App">
      <h1>S-Forecast ver.2.8t — Real-Time 12h Precision+ Nonlinear Edition</h1>

      <div className="selector">
        <label>도시 선택: </label>
        <select value={city} onChange={(e)=>setCity(e.target.value)}>
          {CITY_NAMES.map(n => <option key={n}>{n}</option>)}
        </select>
      </div>

      <h2>실시간 12시간 리듬 예보 — {city}</h2>
      <div className="hourly" style={{ display:"flex", gap:"12px", overflowX:"auto" }}>
        {hourly.length === 0 ? (
          <p className="tiny">데이터 불러오는 중…</p>
        ) : hourly.map((h,i)=>(
          <div key={i} style={{
            flex:"0 0 130px",
            background:"#fafafa",
            borderRadius:"10px",
            textAlign:"center",
            boxShadow:"0 1px 3px rgba(0,0,0,0.1)",
            padding:"8px"
          }}>
            <p className="tiny">{h.time}</p>
            <p>{h.temp.toFixed(1)}°C / {Math.round(h.humidity)}%</p>
            <p>{h.condition}</p>
          </div>
        ))}
      </div>

      <h2>7일 예보 — {city}</h2>
      <table className="forecast">
        <thead>
          <tr>
            <th>날짜(요일)</th><th>상태</th><th>최고 / 최저</th><th>습도(%)</th>
          </tr>
        </thead>
        <tbody>
          {forecast.map(d => (
            <tr key={d.date}>
              <td>{dayStr(d.date)}</td>
              <td>{d.condition}</td>
              <td>{Math.round(d.maxtemp)}° / {Math.round(d.mintemp)}°</td>
              <td>{Math.round(d.humidity)}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className="status-box">
        <p>{status}</p>
        {current && (
          <p className="tiny">
            업데이트: {new Date(current.last_updated).toLocaleString("ko-KR")}
            {"  "}({current.city_en})
          </p>
        )}
      </div>

      <footer>
        <p>Glitch Factory — Adaptive Navier–CEF Hybrid Model</p>
      </footer>
    </div>
  );
}
