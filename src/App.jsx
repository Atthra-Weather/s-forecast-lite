import React, { useState, useEffect } from "react";
import "./App.css";

/** ─────────────────────────────
 *  S-Navier 리듬 모델 (내장, 한 파일)
 *  초기: 평균온도 T0(℃), 평균습도 H0(%), days일 시뮬
 *  ───────────────────────────── */
function simulateSNavier(T0 = 22.5, H0 = 65, days = 7) {
  const hours = days * 24;
  const dt = 1;
  const gamma = 0.04;                 // 감쇠
  const alpha = 0.03;                 // 구동
  const omega = (2 * Math.PI) / 24;   // 일주기
  const beta = 10;                    // 온도 변환 강도

  let rho = T0 / 100;
  const S = [];
  const Tseries = [];
  const Hseries = [];

  for (let t = 0; t < hours; t++) {
    const drho = -gamma * rho + alpha * Math.sin(omega * t);
    rho += drho * dt;
    const s = Math.abs(drho) ** 2;
    S.push(s);

    const temp = T0 + beta * Math.sqrt(s) * Math.sin(omega * t);
    Tseries.push(temp);

    const hum = H0 + 8 * Math.sin(omega * t + Math.PI / 3);
    Hseries.push(Math.max(0, Math.min(100, hum)));
  }

  const Tmax = Math.max(...Tseries);
  const Tmin = Math.min(...Tseries);
  const Tavg = Tseries.reduce((a, b) => a + b, 0) / Tseries.length;
  const Havg = Hseries.reduce((a, b) => a + b, 0) / Hseries.length;

  return { Tmax, Tmin, Tavg, Havg, Tseries, S };
}

/** ─────────────────────────────
 *  날씨 상태(맑음/구름/소나기/폭우) 판정
 *  ───────────────────────────── */
function getCondition(localS, meanS, stdS) {
  const z = (localS - meanS) / (stdS || 1e-6);
  if (z < -0.5) return "맑음";
  if (z < 0.5)  return "구름 많음";
  if (z < 1.2)  return "소나기";
  return "폭우";
}

/** ─────────────────────────────
 *  11개 도시 (한글 표기 그대로)
 *  ───────────────────────────── */
const cityMap = {
  "서울": "Seoul",
  "수원": "Suwon",
  "안산": "Ansan",
  "안양": "Anyang",
  "인천": "Incheon",
  "강릉": "Gangneung",
  "부산": "Busan",
  "도쿄": "Tokyo",
  "오사카": "Osaka",
  "후쿠오카": "Fukuoka",
  "마쓰야마": "Matsuyama"
};

export default function App() {
  const [selectedCity, setSelectedCity] = useState("서울");
  const [forecast, setForecast] = useState([]);
  const [summary, setSummary] = useState("");

  useEffect(() => {
    const today = new Date();

    // ✅ 외부 API 없이, 한 파일 내 S-Navier 모델로 7일 생성
    const model = simulateSNavier(22.5, 65, 7);

    const meanS = model.S.reduce((a, b) => a + b, 0) / model.S.length;
    const stdS = Math.sqrt(
      model.S.reduce((a, b) => a + (b - meanS) ** 2, 0) / model.S.length
    );

    // 7일 예보 생성 (날짜별로 S 변동 반영)
    const daysData = Array.from({ length: 7 }, (_, i) => {
      const d = new Date(today);
      d.setDate(today.getDate() + i);
      const dateStr = d.toISOString().split("T")[0];

      const localS = model.S[i * 24] ?? meanS;
      const humVar = 8 * Math.sin(i / 1.7 + Math.random() * 0.8);
      const dayHumidity = Math.max(20, Math.min(100, model.Havg + humVar));

      return {
        date: dateStr,
        condition: getCondition(localS, meanS, stdS),
        maxTemp: (model.Tavg + Math.sqrt(localS) * 8).toFixed(1),
        minTemp: (model.Tavg - Math.sqrt(localS) * 6).toFixed(1),
        humidity: dayHumidity.toFixed(0)
      };
    });

    // 리듬 요약
    const lastS = model.S[model.S.length - 1];
    let state, desc;
    if (lastS < meanS - stdS * 0.5) {
      state = "안정";
      desc = "리듬이 평형에 가깝습니다. 대체로 맑고 고요한 날씨가 예상됩니다.";
    } else if (lastS < meanS + stdS * 0.5) {
      state = "평형";
      desc = "리듬이 완만하게 변동 중입니다. 구름이 간헐적으로 낄 수 있습니다.";
    } else {
      state = "불안정";
      desc = "리듬이 상승 중입니다. 오후 이후 소나기나 대류 가능성이 있습니다.";
    }

    setForecast(daysData);
    setSummary(`현재 상태: ${state} — ${desc}`);
  }, [selectedCity]);

  return (
    <div className="App">
      <h1>S-Forecast (Navier Model)</h1>

      {/* 도시 선택 (11개) */}
      <div className="city-select" style={{ marginBottom: 12 }}>
        <label style={{ marginRight: 6 }}>도시 선택: </label>
        <select
          value={selectedCity}
          onChange={(e) => setSelectedCity(e.target.value)}
        >
          {Object.keys(cityMap).map((city) => (
            <option key={city} value={city}>
              {city}
            </option>
          ))}
        </select>
      </div>

      <h2 style={{ fontSize: 16, margin: "6px 0 8px" }}>
        {selectedCity} 7일 리듬 예보
      </h2>
      {/* 리듬 예보 3줄 고정(말줄임) → CSS .forecast-text 에서 제어 */}
      <p className="forecast-text">{summary}</p>

      {/* 7일 예보 표 (세로선 없이 중앙정렬) */}
      <table className="forecast-table">
        <thead>
          <tr>
            <th>날짜</th>
            <th>날씨</th>
            <th>최고</th>
            <th>최저</th>
            <th>습도</th>
          </tr>
        </thead>
        <tbody>
          {forecast.map((f) => (
            <tr key={f.date}>
              <td>{f.date}</td>
              <td>{f.condition}</td>
              <td>{f.maxTemp}°C</td>
              <td>{f.minTemp}°C</td>
              <td>{f.humidity}%</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
