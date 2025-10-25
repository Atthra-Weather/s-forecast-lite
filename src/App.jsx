// App.jsx — S-Forecast ver.2.6p-6h-ggr (Gyeonggi Grid Refinement)
import React, { useEffect, useState } from "react";
import "./App.css";

export default function App() {
  const API_KEY = "8370f7e693e34a79bdd180327252510";

  // 한글 표기 + 영문 호출 + 좌표 (정밀도↑)
  const CITY = {
    서울:   { name_en: "Seoul",   lat: 37.5665, lon: 126.9780 },
    수원:   { name_en: "Suwon",   lat: 37.2636, lon: 127.0286 },
    안산:   { name_en: "Ansan",   lat: 37.3219, lon: 126.8309 },
    안양:   { name_en: "Anyang",  lat: 37.3943, lon: 126.9568 },
    강릉:   { name_en: "Gangneung", lat: 37.7519, lon: 128.8761 },
    부산:   { name_en: "Busan",   lat: 35.1796, lon: 129.0756 },
    오사카: { name_en: "Osaka",   lat: 34.6937, lon: 135.5023 },
    후쿠오카:{ name_en: "Fukuoka", lat: 33.5902, lon: 130.4017 },
    유후인: { name_en: "Yufuin",  lat: 33.2659, lon: 131.3461 },
    나고야: { name_en: "Nagoya",  lat: 35.1815, lon: 136.9066 },
    마쓰야마:{ name_en: "Matsuyama", lat: 33.8393, lon: 132.7657 },
  };
  const CITY_NAMES = Object.keys(CITY);

  const [city, setCity] = useState("수원");
  const [current, setCurrent] = useState(null);
  const [forecast, setForecast] = useState([]);   // 일별 7일
  const [hourly, setHourly]   = useState([]);     // 현재~+6시간
  const [status, setStatus]   = useState("로딩 중…");

  // 요일 표시
  const WEEK = ["일","월","화","수","목","금","토"];
  const dayStr = (iso) => {
    const d = new Date(iso);
    const base = d.toLocaleDateString("ko-KR",{month:"short",day:"numeric"});
    return `${base} (${WEEK[d.getDay()]})`;
  };

  // 경기도 정밀화: 중심 ±0.05° 마이크로그리드
  function microgrid(lat, lon, d = 0.05) {
    return [
      { lat, lon },
      { lat, lon: lon - d },
      { lat, lon: lon + d },
      { lat: lat - d, lon },
      { lat: lat + d, lon },
    ];
  }

  // 시간별 리듬 S 계산 (경량 나비에형)
  function computeS({ temp, humidity, wind = 0, cloud = 0, lat = 35 }) {
    const t = (temp - 15) / 12;
    const h = (humidity - 60) / 20;
    const w = (wind - 10) / 10;
    const c = (cloud - 50) / 50;
    const diurnal = Math.sin(temp / 7) * 0.6;
    const interact = 0.4 * h * c + 0.25 * w * c;
    let s = Math.abs(0.9*diurnal + 0.7*h + 0.5*c + 0.4*w + interact);
    s *= 1 + 0.002 * (lat - 35);
    return Math.min(3, s * 1.2);
  }
  function labelFromS(S, isDaily=false) {
    if (!isDaily) { if (S<0.4) return "맑음"; if (S<0.75) return "흐림"; return "비"; }
    if (S<0.30) return "맑음";
    if (S<0.45) return "대체로 맑음";
    if (S<0.60) return "가끔 구름 많음";
    if (S<0.75) return "대체로 흐림";
    if (S<0.90) return "비 또는 소나기";
    return "비 또는 천둥";
  }
  async function fetchPoint(lat, lon) {
    const url = `https://api.weatherapi.com/v1/forecast.json?key=${API_KEY}&q=${lat},${lon}&days=7&aqi=no&alerts=no&lang=ko`;
    const res = await fetch(url);
    return await res.json();
  }

  // 시간축 병합(같은 index 시간끼리 평균)
  function mergeHourly(pointDatas) {
    const key = pointDatas[0].forecast.forecastday[0].hour.map(h=>h.time);
    return key.map((t, idx) => {
      const slice = pointDatas.map(d => d.forecast.forecastday[0].hour[idx]);
      const avg = (k) => slice.reduce((a,b)=>a+(b?.[k]??0),0)/slice.length;
      return {
        time: t,
        temp_c: avg("temp_c"),
        humidity: avg("humidity"),
        wind_kph: avg("wind_kph"),
        cloud: avg("cloud"),
        precip_mm: avg("precip_mm"),
      };
    });
  }
  // 일별 병합
  function mergeDaily(pointDatas) {
    const days = pointDatas[0].forecast.forecastday.length;
    const out = [];
    for (let i=0;i<days;i++){
      const items = pointDatas.map(d=>d.forecast.forecastday[i]);
      const avgDay = (k) => items.reduce((a,b)=>a+(b.day?.[k]??0),0)/items.length;
      out.push({
        date: items[0].date,
        day: {
          avgtemp_c:   avgDay("avgtemp_c"),
          maxtemp_c:   avgDay("maxtemp_c"),
          mintemp_c:   avgDay("mintemp_c"),
          avghumidity: avgDay("avghumidity"),
          maxwind_kph: avgDay("maxwind_kph"),
          totalprecip_mm: avgDay("totalprecip_mm"),
          condition: items[0].day.condition, // 간단 대표
        },
      });
    }
    return out;
  }

  // 리듬 요약(일별 평균 S)
  function summarizeRhythm(days, lat){
    if (!days?.length) return "데이터 없음";
    const Smean = days.reduce((a,d)=>{
      const T=d.day.avgtemp_c, H=d.day.avghumidity, W=d.day.maxwind_kph, C=50;
      return a + computeS({temp:T, humidity:H, wind:W, cloud:C, lat});
    },0)/days.length;
    if (Smean<0.35) return "안정 — 대체로 맑음";
    if (Smean<0.55) return "평형 — 구름 많음";
    if (Smean<0.85) return "불안정 — 한때 소나기";
    return "활성 — 흐림 또는 비";
  }

  async function fetchWeather(cityKo) {
    try {
      const { name_en, lat, lon } = CITY[cityKo];
      // 경기도/수도권 정밀도↑: 마이크로그리드 병렬 호출
      const points = microgrid(lat, lon);
      const datas = await Promise.all(points.map(p => fetchPoint(p.lat, p.lon)));

      // 로컬타임 기준 현재 시각
      const localNow = new Date(datas[0].location.localtime);
      const nowH = localNow.getHours();

      // 병합된 시간별
      const hourlyMerged = mergeHourly(datas);

      // 현재~+6시간 슬라이스 (자정경계 보정)
      const next6 = hourlyMerged.filter(h=>{
        const hh = new Date(h.time.replace(" ","T")).getHours();
        const diff = (hh - nowH + 24) % 24;
        return diff >= 0 && diff < 6;
      }).map(h => ({
        time: h.time.slice(-5),
        temp: h.temp_c,
        humidity: h.humidity,
        condition: labelFromS(
          computeS({ temp:h.temp_c, humidity:h.humidity, wind:h.wind_kph??0, cloud:h.cloud??0, lat }),
          false
        )
      }));

      // 일별 병합
      const daysMerged = mergeDaily(datas);

      // 현재값(간단 평균)
      const curr = {
        temp_c:    datas.reduce((a,d)=>a+(d.current?.temp_c??0),0)/datas.length,
        humidity:  datas.reduce((a,d)=>a+(d.current?.humidity??0),0)/datas.length,
        condition: datas[0].current?.condition,
        last_updated: datas[0].current?.last_updated,
        city_en: name_en,
      };

      setHourly(next6);
      setForecast(daysMerged);
      setCurrent(curr);
      setStatus(summarizeRhythm(daysMerged, lat));
    } catch (e) {
      console.error("Weather fetch error:", e);
      setHourly([]); setForecast([]); setCurrent(null);
      setStatus("데이터 불러오기 실패");
    }
  }

  useEffect(()=>{ fetchWeather(city); },[city]);
  return (
    <div className="App">
      <h1>S-Forecast ver.2.6p-6h</h1>

      <div className="selector">
        <label>도시 선택: </label>
        <select value={city} onChange={(e)=>setCity(e.target.value)}>
          {CITY_NAMES.map(n => <option key={n}>{n}</option>)}
        </select>
      </div>

      {/* 실시간 + 6시간 리듬 예보 */}
      <h2>6시간 리듬 예보 — {city}</h2>
      <div className="hourly">
        {hourly.length === 0 ? (
          <p className="tiny">시간별 데이터를 불러오는 중…</p>
        ) : hourly.map((h, i) => (
          <div className="hour-box" key={i}>
            <p className="tiny">{h.time}</p>
            <p>{h.temp.toFixed(1)}°C / {Math.round(h.humidity)}%</p>
            <p className="tiny">{h.condition}</p>
          </div>
        ))}
      </div>

      {/* 일간 7일 예보 (날짜 + 요일 표시) */}
      <h2>7일 예보 — {city}</h2>
      <table className="forecast">
        <thead>
          <tr>
            <th>날짜(요일)</th>
            <th>상태</th>
            <th>최고 / 최저</th>
          </tr>
        </thead>
        <tbody>
          {forecast.map(d => (
            <tr key={d.date}>
              <td>{dayStr(d.date)}</td>
              <td>{d.day.condition?.text}</td>
              <td>{Math.round(d.day.maxtemp_c)}° / {Math.round(d.day.mintemp_c)}°</td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* 리듬 요약 상태 */}
      <div className="status-box">
        <p className="status">{status}</p>
        {current && (
          <p className="tiny">
            업데이트: {new Date(current.last_updated).toLocaleString("ko-KR")}
            {"  "}({CITY[city].name_en})
          </p>
        )}
      </div>

      <footer>
        <p>Glitch Factory — Adaptive Navier Model</p>
      </footer>
    </div>
  );
}
