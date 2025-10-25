import React, { useEffect, useState } from "react";
import "./App.css";

const API_KEY = "8370f7e693e34a79bdd180327252510";

const cityMap = {
  "서울": "Seoul",
  "부산": "Busan",
  "수원": "Suwon",
  "인천": "Incheon",
  "강릉": "Gangneung",
  "안양": "Anyang",
  "용인": "Yongin",
  "안산": "Ansan",
  "오사카": "Osaka",
  "후쿠오카": "Fukuoka",
  "유후인": "Yufuin",
  "마쓰야마": "Matsuyama",
  "사포로": "Sapporo",
  "나고야": "Nagoya",
  "도쿄": "Tokyo",
};

// ───────────── S-Navier 리듬 모델 ─────────────
function simulateSNavier(initTemp, initHumidity, days = 10) {
  const hours = days * 24;
  const dt = 1;
  const gamma = 0.04;
  const alpha = 0.03;
  const omega = (2 * Math.PI) / 24;
  const beta = 10;

  let rho = initTemp / 100;
  const S = [];
  const Tseries = [];
  const Hseries = [];

  for (let t = 0; t < hours; t++) {
    const drho = -gamma * rho + alpha * Math.sin(omega * t);
    rho += drho * dt;
    const s = Math.abs(drho) ** 2;
    S.push(s);

    const temp = initTemp + beta * Math.sqrt(s) * Math.sin(omega * t);
    Tseries.push(temp);

    const hum = initHumidity + 8 * Math.sin(omega * t + Math.PI / 3);
    Hseries.push(Math.max(0, Math.min(100, hum)));
  }

  const Tmax = Math.max(...Tseries);
  const Tmin = Math.min(...Tseries);
  const Tavg = Tseries.reduce((a, b) => a + b, 0) / Tseries.length;
  const Havg = Hseries.reduce((a, b) => a + b, 0) / Hseries.length;

  return { Tmax, Tmin, Tavg, Havg, Tseries, S };
}

function s_forecast_report(S) {
  const mean = S.reduce((a, b) => a + b, 0) / S.length;
  const std = Math.sqrt(S.map(v => (v - mean) ** 2).reduce((a, b) => a + b, 0) / S.length);
  const ratio = (S[S.length - 1] - mean) / std;

  if (ratio < -0.5)
    return { state: "안정 ☀️", desc: "리듬이 평형을 유지하고 있습니다. 대체로 맑고 고요한 날씨." };
  if (ratio < 0.5)
    return { state: "평형 🌤", desc: "리듬이 완만한 진동 범위 내에 있습니다. 변화가 적은 하루." };
  if (ratio < 1.5)
    return { state: "불안정 🌧", desc: "리듬이 상승하고 있습니다. 국지적 대류 가능성이 있습니다." };
  return { state: "격렬 ⚡️", desc: "리듬이 급격히 교호 중입니다. 돌풍이나 소나기 가능성." };
}

export default function App() {
  const [selectedCity, setSelectedCity] = useState("서울");
  const [daily, setDaily] = useState([]);
  const [hourly, setHourly] = useState([]);
  const [sResult, setSResult] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => { fetchWeather(selectedCity); }, [selectedCity]);

  const fetchWeather = async (city) => {
    try {
      const query = cityMap[city] || city;
      const res = await fetch(
        `https://api.weatherapi.com/v1/current.json?key=${API_KEY}&q=${query}&lang=ko`
      );
      if (!res.ok) throw new Error(`HTTP Error ${res.status}`);

      const data = await res.json();
      const initTemp = data.current.temp_c;
      const initHumidity = data.current.humidity;
      const model = simulateSNavier(initTemp, initHumidity, 10);

      const s_out = s_forecast_report(model.S);
      const today = new Date();

      // 날짜별 변동 있는 예보 생성
      const daysData = Array.from({ length: 10 }, (_, i) => {
        const d = new Date(today);
        d.setDate(today.getDate() + i);
        const dateStr = d.toISOString().split("T")[0];

        const localS = model.S[i * 24] || model.S[0];
        const humVar = 10 * Math.sin(i / 2 + Math.random() * 0.5);
        const dayHumidity = Math.max(0, Math.min(100, model.Havg + humVar));

        const condition =
          localS < 0.0008 ? "맑음 ☀️" :
          localS < 0.002 ? "구름 많음 🌤" :
          localS < 0.005 ? "소나기 🌧" : "폭우 ⚡️";

        return {
          date: dateStr,
          maxTemp: (model.Tavg + Math.sqrt(localS) * 8).toFixed(1),
          minTemp: (model.Tavg - Math.sqrt(localS) * 6).toFixed(1),
          avgTemp: model.Tavg.toFixed(1),
          humidity: dayHumidity.toFixed(0),
          condition,
        };
      });

      // 실시간 리듬 온도 예보
      const hourlyData = model.Tseries.slice(0, 24).map((t, i) => ({
        time: `${String(i).padStart(2, "0")}:00`,
        temp: t.toFixed(1),
      }));

      setSResult(s_out);
      setDaily(daysData);
      setHourly(hourlyData);
      setError(null);
    } catch (err) {
      console.error("❌ Error fetching weather:", err);
      setError(err.message);
      setSResult(null);
      setDaily([]);
      setHourly([]);
    }
  };

  return (
    <div className="app">
      <header className="header">
        <h1>S-Navier Forecast</h1>
        <select value={selectedCity} onChange={(e) => setSelectedCity(e.target.value)}>
          {Object.keys(cityMap).map((c) => (
            <option key={c}>{c}</option>
          ))}
        </select>
      </header>

      {error ? (
        <p className="error">⚠️ 데이터 로드 실패: {error}</p>
      ) : (
        <>
          {sResult && (
            <section className="s-model-section">
              <h2>리듬 예보</h2>
              <p><strong>{sResult.state}</strong></p>
              <p>{sResult.desc}</p>
            </section>
          )}

          <section className="hourly-section">
            <p className="forecast-date">예보 기준일: {new Date().toISOString().split("T")[0]}</p>
            <div className="hourly-scroll small-text">
              {hourly.map((h, i) => (
                <div key={i} className="hour-card">
                  <p>{h.time}</p>
                  <p>{h.temp}°C</p>
                </div>
              ))}
            </div>
          </section>

          <section className="daily-section">
            <h2>10일 예보</h2>
            <table>
              <thead>
                <tr>
                  <th>날짜</th>
                  <th>최고</th>
                  <th>최저</th>
                  <th>평균기온</th>
                  <th>습도</th>
                  <th>날씨</th>
                </tr>
              </thead>
              <tbody>
                {daily.map((d, i) => (
                  <tr key={i}>
                    <td>{d.date}</td>
                    <td>{d.maxTemp}°C</td>
                    <td>{d.minTemp}°C</td>
                    <td>{d.avgTemp}°C</td>
                    <td>{d.humidity}%</td>
                    <td>{d.condition}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
        </>
      )}

      <footer>© 2025 S-Navier Model · Glitch Factory</footer>
    </div>
  );
}
