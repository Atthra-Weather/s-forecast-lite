// App.jsx — S-Forecast ver.2.8r-Fix (Real-Time 12h Horizontal + Guards)
import React, { useEffect, useState } from "react";
import "./App.css";

export default function App() {
  const API_KEY = "YOUR_WEATHERAPI_KEY"; // 🔐 키 넣어주세요

  // 사용자가 주신 도시 세트 (원하는 만큼 추가/수정 가능)
  const CITIES = {
    서울:    { name_en: "Seoul",     lat: 37.5665, lon: 126.9780, alt: 20 },
    수원:    { name_en: "Suwon",     lat: 37.2636, lon: 127.0286, alt: 30 },
    용인:    { name_en: "Yongin",    lat: 37.2753, lon: 127.1159, alt: 70 },
    안산:    { name_en: "Ansan",     lat: 37.3219, lon: 126.8309, alt: 15 },
    안양:    { name_en: "Anyang",    lat: 37.3943, lon: 126.9568, alt: 25 },
    강릉:    { name_en: "Gangneung", lat: 37.7519, lon: 128.8761, alt: 50 },
    부산:    { name_en: "Busan",     lat: 35.1796, lon: 129.0756, alt: 5  },
    오사카:  { name_en: "Osaka",     lat: 34.6937, lon: 135.5023, alt: 10 },
    후쿠오카:{ name_en: "Fukuoka",   lat: 33.5902, lon: 130.4017, alt: 20 },
    유후인:  { name_en: "Yufuin",    lat: 33.2659, lon: 131.3461, alt: 150 },
    나고야:  { name_en: "Nagoya",    lat: 35.1815, lon: 136.9066, alt: 15 },
    마쓰야마:{ name_en: "Matsuyama", lat: 33.8393, lon: 132.7657, alt: 30 },
  };

  const [cards, setCards] = useState([]);     // 도시별 카드 데이터 배열
  const [error, setError] = useState(null);   // 전역 오류 표시

  useEffect(() => {
    const fetchAll = async () => {
      try {
        const entries = Object.entries(CITIES);

        const results = await Promise.all(entries.map(async ([kor, info]) => {
          try {
            const url = `https://api.weatherapi.com/v1/forecast.json?key=${API_KEY}&q=${info.lat},${info.lon}&days=2&aqi=no&alerts=no&lang=ko`;
            const res = await fetch(url);
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            const data = await res.json();

            // 응답 가드
            const current = data?.current;
            const forecast = data?.forecast?.forecastday;
            if (!current || !forecast || !forecast[0]?.hour) {
              return { city: kor, error: "데이터 부족" };
            }

            // 오늘+내일 시간 배열 이어붙이기
            const hoursAll = forecast.flatMap(d => d.hour || []);
            // 지역 현지 시각(epoch) 기준으로 현재 이후 12개 연속 추출
            const baseEpochSec = data?.location?.localtime_epoch ?? Math.floor(Date.now()/1000);
            const next12 = hoursAll
              .filter(h => (h?.time_epoch ?? 0) >= baseEpochSec)
              .slice(0, 12)
              .map(h => ({
                time: h?.time ? h.time.split(" ")[1] : "--:--",
                temp: typeof h?.temp_c === "number" ? h.temp_c : NaN,
                cond: h?.condition?.text || "-",
                humidity: typeof h?.humidity === "number" ? h.humidity : NaN,
              }));

            // 카드 데이터 구성
            return {
              city: kor,
              nowTemp: current?.temp_c,
              nowCond: current?.condition?.text,
              nowHum: current?.humidity,
              hours: next12,
            };
          } catch (e) {
            return { city: kor, error: e.message || "도시 요청 실패" };
          }
        }));

        setCards(results);
      } catch (e) {
        setError(e.message || "네트워크 오류");
      }
    };

    fetchAll();
  }, []);

  return (
    <div className="App" style={{ padding: 16 }}>
      <h2 style={{ margin: "0 0 8px" }}>S-Forecast ver.2.8r — 실시간(가로) 12시간</h2>
      {error && <p style={{ color: "crimson" }}>오류: {error}</p>}

      {/* 가로 스크롤 컨테이너 */}
      <div
        style={{
          display: "flex",
          gap: 16,
          overflowX: "auto",
          padding: "12px 8px",
          borderTop: "1px solid #ddd",
          borderBottom: "1px solid #ddd",
        }}
      >
        {cards.map((card, idx) => (
          <React.Fragment key={card.city}>
            <div
              style={{
                flex: "0 0 260px",
                borderRadius: 12,
                background: "#fafafa",
                boxShadow: "0 1px 3px rgba(0,0,0,0.08)",
                padding: 12,
                textAlign: "center",
              }}
            >
              <h3 style={{ margin: "4px 0 8px" }}>{card.city}</h3>

              {/* 현재 */}
              {card.error ? (
                <p style={{ color: "#c00", margin: 0 }}>로드 실패: {card.error}</p>
              ) : (
                <>
                  <p style={{ margin: 0, fontSize: 15 }}>
                    {typeof card.nowTemp === "number" ? `${card.nowTemp.toFixed(1)}°C` : "--"}
                  </p>
                  <p style={{ margin: 0 }}>{card.nowCond || "-"}</p>
                  <p style={{ margin: 0, fontSize: 13, color: "#666" }}>
                    습도 {typeof card.nowHum === "number" ? card.nowHum : "--"}%
                  </p>

                  {/* 12시간 가로 리스트 */}
                  <div
                    style={{
                      marginTop: 8,
                      display: "flex",
                      gap: 8,
                      overflowX: "auto",
                      justifyContent: "center",
                    }}
                  >
                    {(card.hours && card.hours.length ? card.hours : Array.from({ length: 12 }, () => null))
                      .map((h, i) => (
                        <div
                          key={i}
                          style={{
                            minWidth: 60,
                            border: "1px solid #e0e0e0",
                            borderRadius: 8,
                            padding: "6px 4px",
                            background: "#fff",
                          }}
                        >
                          <p style={{ margin: 0, fontSize: 11 }}>{h ? h.time : "--:--"}</p>
                          <p style={{ margin: 0, fontSize: 12 }}>
                            {h && typeof h.temp === "number" ? `${h.temp.toFixed(0)}°` : "-"}
                          </p>
                          <p style={{ margin: 0, fontSize: 10, color: "#555" }}>{h ? h.cond : "-"}</p>
                        </div>
                      ))}
                  </div>
                </>
              )}
            </div>

            {/* 카드 사이 구분선 */}
            {idx < cards.length - 1 && (
              <div style={{ width: 1, background: "#d9d9d9", alignSelf: "stretch" }} />
            )}
          </React.Fragment>
        ))}
      </div>
    </div>
  );
}
