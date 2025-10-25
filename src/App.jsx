import React, { useEffect, useState } from "react";
import "./App.css";

const API_KEY = "8370f7e693e34a79bdd180327252510";

// 한글 표시는 유지하면서, 실제 쿼리는 영어
const cities = [
  { name: "서울", query: "Seoul" },
  { name: "수원", query: "Suwon" },
  { name: "안산", query: "Ansan" },
  { name: "안양", query: "Anyang" },
  { name: "인천", query: "Incheon" },
  { name: "강릉", query: "Gangneung" },
  { name: "부산", query: "Busan" },
  { name: "도쿄", query: "Tokyo" },
  { name: "오사카", query: "Osaka" },
  { name: "후쿠오카", query: "Fukuoka" },
  { name: "마쓰야마", query: "Matsuyama" },
];

export default function App() {
  const [selectedCity, setSelectedCity] = useState("서울");
  const [forecast, setForecast] = useState([]);
  const [status, setStatus] = useState({ state: "", desc: "" });

  // --- Navier 모델 계산식 ---
  function navierModel(temp, humidity) {
    const rho = humidity / 100;
    const dRho = Math.sin(temp / 10) * 0.1;
    const S = Math.abs(dRho) * 10;
    let state, desc;

    if (S < 0.5) {
      state = "안정";
      desc = "리듬이 평형을 유지하고 있습니다. 대체로 맑고 고요한 상태입니다.";
    } else if (S < 1.5) {
      state = "불안정";
      desc = "리듬이 약간 요동치고 있습니다. 구름이 많고 변화가 감지됩니다.";
    } else {
      state = "복원";
      desc = "리듬이 급격히 상승 중입니다. 대류 활동과 강수 가능성이 있습니다.";
    }
    return { S, state, desc };
  }

  // --- WeatherAPI fetch + Navier 모델 적용 ---
  useEffect(() => {
    const fetchData = async () => {
      const cityQuery = cities.find((c) => c.name === selectedCity)?.query;
      const url = `https://api.weatherapi.com/v1/forecast.json?key=${API_KEY}&q=${cityQuery}&days=7&aqi=no&alerts=no&lang=ko`;

      const res = await fetch(url);
      const data = await res.json();

      const processed = data.forecast.forecastday.map((d) => {
        const { S } = navierModel(d.day.avgtemp_c, d.day.avghumidity);
        const max = d.day.avgtemp_c + 3 * S;
        const min = d.day.avgtemp_c - 2 * S;
        const condition =
          S < 0.5 ? "맑음" : S < 1.5 ? "흐림" : "비 또는 소나기";
        return {
          date: d.date,
          avgtemp: d.day.avgtemp_c.toFixed(1),
          maxtemp: max.toFixed(1),
          mintemp: min.toFixed(1),
          humidity: d.day.avghumidity,
          condition,
        };
      });

      const { state, desc } = navierModel(
        data.current.temp_c,
        data.current.humidity
      );

      setStatus({ state, desc });
      setForecast(processed);
    };

    fetchData();
  }, [selectedCity]);

  return (
    <div className="App">
      <h1 className="app-title">S-Forecast · Navier Model</h1>

      <div className="city-selector">
        <select
          value={selectedCity}
          onChange={(e) => setSelectedCity(e.target.value)}
        >
          {cities.map((c) => (
            <option key={c.query}>{c.name}</option>
          ))}
        </select>
      </div>

      <div className="realtime-status">
        <h2>리듬 예보</h2>
        <p className="state">{status.state}</p>
        <p className="desc">{status.desc}</p>
      </div>

      <div className="forecast-table">
        <h2>7일 예보</h2>
        <table>
          <thead>
            <tr>
              <th>날짜</th>
              <th>날씨</th>
              <th>평균기온(°C)</th>
              <th>최고</th>
              <th>최저</th>
              <th>습도(%)</th>
            </tr>
          </thead>
          <tbody>
            {forecast.map((d) => (
              <tr key={d.date}>
                <td>{d.date}</td>
                <td>{d.condition}</td>
                <td>{d.avgtemp}</td>
                <td>{d.maxtemp}</td>
                <td>{d.mintemp}</td>
                <td>{d.humidity}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <footer>© 2025 Glitch Factory · S-Forecast Navier Model ver. 2.1</footer>
    </div>
  );
}
