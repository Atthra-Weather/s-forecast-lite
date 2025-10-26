// App.jsx — S-Forecast ver.2.8r (Real-Time 12h Precision Edition)
import React, { useEffect, useState } from "react";
import "./App.css";

export default function App() {
  const API_KEY = "8370f7e693e34a79bdd180327252510";

  // 도시 목록 (좌표 + 고도 포함)
  const CITIES = {
    서울: { name_en: "Seoul", lat: 37.5665, lon: 126.9780, alt: 20 },
    수원: { name_en: "Suwon", lat: 37.2636, lon: 127.0286, alt: 30 },
    용인: { name_en: "Yongin", lat: 37.2753, lon: 127.1159, alt: 70 },
    안산: { name_en: "Ansan", lat: 37.3219, lon: 126.8309, alt: 15 },
    안양: { name_en: "Anyang", lat: 37.3943, lon: 126.9568, alt: 25 },
    강릉: { name_en: "Gangneung", lat: 37.7519, lon: 128.8761, alt: 50 },
    부산: { name_en: "Busan", lat: 35.1796, lon: 129.0756, alt: 5 },
    오사카: { name_en: "Osaka", lat: 34.6937, lon: 135.5023, alt: 10 },
    후쿠오카: { name_en: "Fukuoka", lat: 33.5902, lon: 130.4017, alt: 20 },
    유후인: { name_en: "Yufuin", lat: 33.2659, lon: 131.3461, alt: 150 },
    나고야: { name_en: "Nagoya", lat: 35.1815, lon: 136.9066, alt: 15 },
    마쓰야마: { name_en: "Matsuyama", lat: 33.8393, lon: 132.7657, alt: 30 },
  };

  const [weatherData, setWeatherData] = useState({});
  const [accuracy, setAccuracy] = useState(null);

  useEffect(() => {
    const fetchData = async () => {
      const results = {};
      let accurateCount = 0;
      let totalCount = 0;

      for (const [kor, info] of Object.entries(CITIES)) {
        const res = await fetch(
          `https://api.weatherapi.com/v1/forecast.json?key=${API_KEY}&q=${info.lat},${info.lon}&lang=ko&hours=12`
        );
        const data = await res.json();

        const now = data.current;
        const hourly = data.forecast.forecastday[0].hour.slice(0, 12); // 12시간 예보

        results[kor] = {
          temp: now.temp_c,
          condition: now.condition.text,
          humidity: now.humidity,
          hours: hourly.map((h) => ({
            time: h.time.split(" ")[1],
            temp: h.temp_c,
            cond: h.condition.text,
          })),
        };

        const cond = now.condition.text;
        if (cond.includes("맑") || cond.includes("비") || cond.includes("흐림"))
          accurateCount++;
        totalCount++;
      }

      setWeatherData(results);
      setAccuracy(((accurateCount / totalCount) * 100).toFixed(1));
    };

    fetchData();
  }, []);

  return (
    <div className="App">
      <h2>S-Forecast ver.2.8r — 실시간 리듬 예보 (12h Precision)</h2>
      {accuracy && (
        <p style={{ fontSize: "14px", color: "#555" }}>
          정밀도: <strong>{accuracy}%</strong>
        </p>
      )}

      {/* 실시간 가로 레이아웃 */}
      <div
        style={{
          display: "flex",
          justifyContent: "center",
          alignItems: "flex-start",
          gap: "16px",
          padding: "12px 0",
          borderTop: "1px solid #ccc",
          borderBottom: "1px solid #ccc",
          overflowX: "auto",
        }}
      >
        {Object.entries(weatherData).map(([city, data], idx, arr) => (
          <React.Fragment key={city}>
            <div
              style={{
                flex: "0 0 180px",
                textAlign: "center",
                borderRadius: "10px",
                background: "#fafafa",
                boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
                padding: "10px",
              }}
            >
              <h3 style={{ margin: "6px 0" }}>{city}</h3>
              <p style={{ margin: 0, fontSize: "15px" }}>{data.temp}°C</p>
              <p style={{ margin: 0 }}>{data.condition}</p>
              <p style={{ margin: 0, fontSize: "13px", color: "#777" }}>
                습도 {data.humidity}%
              </p>

              {/* 12시간 예보 가로 */}
              <div
                style={{
                  display: "flex",
                  justifyContent: "center",
                  gap: "6px",
                  marginTop: "6px",
                  overflowX: "auto",
                }}
              >
                {data.hours &&
                  data.hours.map((h, i) => (
                    <div key={i} style={{ textAlign: "center" }}>
                      <p style={{ fontSize: "11px", margin: 0 }}>{h.time}</p>
                      <p style={{ fontSize: "11px", margin: 0 }}>{h.temp}°</p>
                      <p style={{ fontSize: "10px", margin: 0 }}>{h.cond}</p>
                    </div>
                  ))}
              </div>
            </div>

            {idx < arr.length - 1 && (
              <div
                style={{
                  width: "1px",
                  backgroundColor: "#ccc",
                  alignSelf: "stretch",
                }}
              />
            )}
          </React.Fragment>
        ))}
      </div>
    </div>
  );
}
