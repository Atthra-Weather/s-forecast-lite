import React, { useEffect, useState } from "react";

// S-Forecast ver.2.7 (12시간 실시간) - Adaptive Navier Model Implementation

export default function App() {
  // NOTE: API Key must be kept empty as per instructions. Canvas will provide it in runtime if needed.
  const API_KEY = "8370f7e693e34a79bdd180327252510"; // Placeholder for demonstration/testing purposes

  // 도시 정보: lat, lon, alt는 S-Criterion 보정 인자로 사용됨
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
  const [loading, setLoading] = useState(false);

  const WEEK = ["일","월","화","수","목","금","토"];
  const dayStr = (iso) => {
    const d = new Date(iso);
    const base = d.toLocaleDateString("ko-KR",{month:"short",day:"numeric"});
    return `${base} (${WEEK[d.getDay()]})`;
  };

  /**
   * 미세 격자망(Microgrid)을 생성하여 여러 지점의 평균을 구합니다.
   */
  function microgrid(lat, lon, d = 0.03) {
    return [
      { lat, lon },
      { lat: lat + d, lon },
      { lat: lat - d, lon },
    ];
  }

  /**
   * S-기준 근사값 (리듬 방출량)을 계산합니다.
   * === S-CRITERION OPTIMIZATION ZONE (ver. 2.7.1 - Nonlinear Enhanced) ===
   * 비선형 상호작용 항의 가중치를 높여 카오스적 불안정성에 대한 민감도를 강화했습니다.
   */
  function computeS({ temp, humidity, wind = 0, cloud = 0, lat = 35, alt = 0 }) {
    // 변수들을 표준화하여 비선형성 항을 근사합니다.
    const t = (temp - 15) / 12; // 온도 편차 (일주 운동 리듬 근사)
    const h = (humidity - 60) / 20; // 습도 편차 (밀도 rho의 변화 근사)
    const w = (wind - 10) / 10; // 바람 편차 (속도 |v|의 변화 근사)
    const c = (cloud - 50) / 50; // 구름 편차 (위상 Phi의 변화 근사)
    
    // 1. 순수 리듬 및 변화율 항 (계수 미세 조정)
    const diurnal = Math.sin(temp / 7) * 0.5; // 일주 리듬 계수 0.6 -> 0.5 (주간 리듬 의존도 소폭 감소)
    
    // 비선형 상호작용 항 강화: 습도(밀도)와 구름(위상)의 복합 작용 민감도 증가
    const interact_hc = 0.6 * h * c; // 0.4 -> 0.6 (H & C 상호작용 증가)
    const interact_wc = 0.3 * w * c; // 0.25 -> 0.3 (W & C 상호작용 소폭 증가)
    const interact = interact_hc + interact_wc;
    
    // 2. S-기준 (리듬 방출량) 계산: 계수 조정
    let s = Math.abs(
        0.5*diurnal + // 일주 리듬
        0.8*h +       // 밀도 변화 (습도) 민감도 0.7 -> 0.8
        0.6*c +       // 위상 변화 (구름) 민감도 0.5 -> 0.6
        0.3*w +       // 속도 변화 (바람) 민감도 0.4 -> 0.3 (바람 단독 효과는 소폭 감소)
        interact      // 강화된 비선형 상호작용
    );
    
    // 3. 지형/위도 보정
    s *= (1 - alt/1000*0.05) * (1 + 0.002 * (lat - 35));
    
    // 유한성 제약: 최대 3으로 제한
    return Math.min(3, s * 1.2);
  }
  // === END S-CRITERION OPTIMIZATION ZONE ===

  /**
   * S-기준 값에 따른 대기 시스템의 '구조적 안정성' 라벨을 부여합니다.
   */
  function labelFromS(S, isDaily=false) {
    if (!isDaily) {
      if (S<0.4) return "정칙적 맑음 (안정)";
      if (S<0.75) return "평형적 흐림 (중립)";
      return "불안정 강수 (활성)";
    }
    // 일일 평균 S-기준에 따른 장기 리듬 해석
    if (S<0.30) return "맑음 (최소 방출)";
    if (S<0.45) return "대체로 맑음 (낮은 방출)";
    if (S<0.60) return "가끔 구름 많음 (중립)";
    if (S<0.75) return "대체로 흐림 (불규칙)";
    if (S<0.90) return "비/소나기 (리듬 붕괴)";
    return "비 또는 천둥 (최대 활성)";
  }

  function rainCorrection(rain, chance) {
    if (rain < 0.1 && chance < 10) return 0;
    return rain;
  }

  const fetchWithRetry = async (url, retries = 3) => {
    for (let i = 0; i < retries; i++) {
        try {
            const res = await fetch(url);
            if (!res.ok) throw new Error(`API status ${res.status}`);
            const data = await res.json();
            if (data?.error) throw new Error(data.error.message);
            return data;
        } catch (error) {
            console.warn(`Attempt ${i + 1} failed: ${error.message}. Retrying...`);
            if (i === retries - 1) throw error;
            await new Promise(resolve => setTimeout(resolve, Math.pow(2, i) * 1000)); // Exponential backoff
        }
    }
  };

  async function fetchPoint(lat, lon) {
    const url = `https://api.weatherapi.com/v1/forecast.json?key=${API_KEY}&q=${lat.toFixed(4)},${lon.toFixed(4)}&days=7&aqi=no&alerts=no&lang=ko`;
    const data = await fetchWithRetry(url);
    if (!data?.location) throw new Error("Invalid location data");
    return data;
  }

  /**
   * 미세 격자망에서 얻은 시간별 데이터를 공간적으로 평균합니다.
   */
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
        chance_of_rain: avg("chance_of_rain"),
      };
    });
  }

  /**
   * 시간별 데이터의 변화율(Gradient)을 계산하기 위해 이동 평균으로 데이터를 평활화(Smooth)합니다.
   */
  const smooth = (arr, key) =>
    arr.map((v,i) => {
      const prev = arr[i-1]?.[key] ?? v[key];
      const next = arr[i+1]?.[key] ?? v[key];
      return (prev + v[key] + next) / 3;
    });

  /**
   * 일일 데이터를 공간적으로 평균합니다.
   */
  function mergeDaily(pointDatas) {
    const days = pointDatas[0].forecast.forecastday.length;
    const out = [];
    for (let i=0;i<days;i++){
      const items = pointDatas.map(d=>d.forecast.forecastday[i]);
      const avgDay = (k) => items.reduce((a,b)=>a+(b.day?.[k]??0),0)/items.length;
      out.push({
        date: items[0].date,
        day: {
          avgtemp_c: avgDay("avgtemp_c"),
          maxtemp_c: avgDay("maxtemp_c"),
          mintemp_c: avgDay("mintemp_c"),
          avghumidity: avgDay("avghumidity"),
          maxwind_kph: avgDay("maxwind_kph"),
          totalprecip_mm: avgDay("totalprecip_mm"),
          // 앙상블 평균 대신, 중심점의 주요 조건을 대표로 사용
          condition: items[0].day.condition,
        },
      });
    }
    return out;
  }

  /**
   * 7일 예측 기간 동안의 S-기준 평균을 기반으로 장기 리듬 안정성을 요약합니다.
   */
  function summarizeRhythm(days, lat, alt){
    if (!days?.length) return "데이터 없음";
    const Smean = days.reduce((a,d)=>{
      const T=d.day.avgtemp_c, H=d.day.avghumidity, W=d.day.maxwind_kph, C=50; // 구름은 평균 50%로 임의 설정
      return a + computeS({temp:T, humidity:H, wind:W, cloud:C, lat, alt});
    },0)/days.length;

    // S_total / T (평균 리듬 방출량)에 따른 구조적 진단
    if (Smean<0.35) return `[S-Total 안정] $\\mathcal{S}_{avg} \\approx ${Smean.toFixed(2)}$: 구조적 안정성 최대, 정칙적 맑음 예상.`;
    if (Smean<0.55) return `[S-평형] $\\mathcal{S}_{avg} \\approx ${Smean.toFixed(2)}$: 리듬 평형 상태, 예측 신뢰도 높음.`;
    if (Smean<0.85) return `[S-불안정] $\\mathcal{S}_{avg} \\approx ${Smean.toFixed(2)}$: 리듬 방출량 증가, 예측 불확실성 경고.`;
    return `[S-활성] $\\mathcal{S}_{avg} \\approx ${Smean.toFixed(2)}$: 시스템 활성 상태, 비선형성이 강해져 예측 신뢰도가 낮아질 수 있음.`;
  }

  async function fetchWeather(cityKo) {
    setLoading(true);
    setStatus("리듬 구조 데이터 분석 중...");
    try {
      const { name_en, lat, lon, alt } = CITY[cityKo];
      const points = microgrid(lat, lon);
      const datas = await Promise.all(points.map(p => fetchPoint(p.lat, p.lon)));

      const localNow = new Date(datas[0].location.localtime.replace(" ", "T"));
      const nowH = localNow.getHours();

      let hourlyMerged = mergeHourly(datas);
      const temps = smooth(hourlyMerged, "temp_c"); // 온도 평활화
      const hums  = smooth(hourlyMerged, "humidity"); // 습도 평활화

      // --- 12시간 실시간 분석 (S-기준 적용) ---
      const next12 = hourlyMerged.filter(h=>{
        const hh = new Date(h.time.replace(" ","T")).getHours();
        // 현재 시간부터 12시간 후까지의 데이터 필터링
        const diff = (hh - nowH + 24) % 24;
        return diff >= 0 && diff < 12;
      }).map((h,i) => {
        // 평활화된 데이터를 S-기준 계산에 사용
        const S = computeS({ temp:temps[i], humidity:hums[i], wind:h.wind_kph??0, cloud:h.cloud??0, lat, alt });
        const rain = rainCorrection(h.precip_mm ?? 0, h.chance_of_rain ?? 0);
        
        let condition = labelFromS(S,false); // S-기준에 따른 구조적 상태 진단
        
        // 실제 강수 데이터를 최종 라벨에 반영
        if (rain > 0) {
          condition = "강수 (활성)";
        } else if (S > 0.75) {
          condition = "높은 불안정 (흐림)";
        }
        
        // S 값은 분석을 위해 객체에 추가
        return { time: h.time.slice(-5), temp: h.temp_c, humidity: h.humidity, condition, S: S.toFixed(2) };
      });

      const daysMerged = mergeDaily(datas);
      const curr = {
        temp_c:    datas.reduce((a,d)=>a+(d.current?.temp_c??0),0)/datas.length,
        humidity:  datas.reduce((a,d)=>a+(d.current?.humidity??0),0)/datas.length,
        condition: datas[0].current?.condition,
        last_updated: datas[0].current?.last_updated,
        city_en: name_en,
      };

      setHourly(next12);
      setForecast(daysMerged);
      setCurrent(curr);
      setStatus(summarizeRhythm(daysMerged, lat, alt));
    } catch (e) {
      console.error("Weather fetch error for", cityKo, e.message);
      setHourly([]); setForecast([]); setCurrent(null);
      setStatus(`데이터 불러오기 실패 (${cityKo}). API/네트워크 오류.`);
    } finally {
      setLoading(false);
    }
  }

  // 초기 로드 및 도시 변경 시 데이터 페치
  useEffect(()=>{ fetchWeather(city); },[city]);

  return (
    <div className="min-h-screen bg-gray-900 text-gray-100 p-4 font-sans flex flex-col items-center">
      
      {/* Header */}
      <div className="w-full max-w-2xl bg-gray-800 p-6 rounded-xl shadow-2xl border border-blue-700/50">
        <h1 className="text-3xl font-extrabold text-blue-400 mb-2 tracking-wider">
          S-Forecast ver.2.7.1
        </h1>
        <p className="text-sm text-gray-400">
          개념 존재 구조론(CEF) 기반 리듬 안정성 예측
        </p>

        {/* City Selector */}
        <div className="mt-4 flex flex-col sm:flex-row items-center justify-between space-y-3 sm:space-y-0">
          <label htmlFor="city-select" className="text-gray-300 font-semibold mr-3">
            측정 도시:
          </label>
          <select 
            id="city-select"
            value={city} 
            onChange={(e)=>setCity(e.target.value)}
            className="w-full sm:w-auto p-2 bg-gray-700 border border-blue-600 rounded-lg text-lg text-white focus:ring-2 focus:ring-blue-400 transition"
          >
            {CITY_NAMES.map(n => <option key={n} value={n}>{n}</option>)}
          </select>
        </div>
      </div>

      {/* Loading Indicator */}
      {loading && (
        <div className="mt-6 p-4 w-full max-w-2xl bg-blue-900/50 text-blue-300 rounded-xl text-center shadow-lg animate-pulse">
          데이터 구조화 및 $\mathbf{S}$-기준 계산 중...
        </div>
      )}

      {/* Hourly Forecast */}
      <div className="w-full max-w-2xl mt-6">
        <h2 className="text-xl font-bold text-gray-200 mb-3 border-b border-gray-700 pb-1">
          12시간 $\mathbf{S}$-리듬 분석 — {city}
        </h2>
        <div className="flex overflow-x-auto pb-3 space-x-3 scrollbar-hide">
          {hourly.length === 0 && !loading ? (
            <p className="text-gray-400 text-sm">시간별 데이터를 불러오는 데 실패했습니다.</p>
          ) : hourly.map((h,i)=>(
            <div 
              className={`flex-shrink-0 w-32 p-3 rounded-xl shadow-lg border-2 
              ${parseFloat(h.S) < 0.4 ? 'bg-green-800/30 border-green-600/50' : 
                parseFloat(h.S) < 0.75 ? 'bg-yellow-800/30 border-yellow-600/50' : 
                'bg-red-800/30 border-red-600/50'} 
              transition duration-300 hover:scale-[1.03]`} 
              key={i}
            >
              <p className="text-lg font-bold text-white mb-1">{h.time}</p>
              <p className="text-xl font-extrabold">{h.temp.toFixed(1)}°C</p>
              <p className="text-sm text-gray-300 mb-2">{Math.round(h.humidity)}%</p>
              <p className="text-xs font-semibold uppercase">{h.condition}</p>
              <p className="text-xs text-gray-400 mt-1">S: {h.S}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Daily Forecast Table */}
      <div className="w-full max-w-2xl mt-6">
        <h2 className="text-xl font-bold text-gray-200 mb-3 border-b border-gray-700 pb-1">
          7일 $\mathbf{S}$-경향 예보
        </h2>
        <table className="w-full table-auto rounded-xl overflow-hidden shadow-xl">
          <thead className="bg-gray-700 text-gray-300 uppercase text-xs sm:text-sm">
            <tr>
              <th className="p-3 text-left">날짜(요일)</th>
              <th className="p-3 text-left">일반 상태</th>
              <th className="p-3 text-center">온도(최고/최저)</th>
              <th className="p-3 text-center hidden sm:table-cell">습도(%)</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-700/50">
            {forecast.map(d => (
              <tr key={d.date} className="bg-gray-800 hover:bg-gray-700/50 transition">
                <td className="p-3 text-sm font-medium text-blue-300">{dayStr(d.date)}</td>
                <td className="p-3 text-sm">{d.day.condition?.text}</td>
                <td className="p-3 text-sm text-center font-mono">
                  {Math.round(d.day.maxtemp_c)}° / {Math.round(d.day.mintemp_c)}°
                </td>
                <td className="p-3 text-sm text-center hidden sm:table-cell">{Math.round(d.day.avghumidity)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* S-Criterion Summary (Status Box) */}
      <div className="w-full max-w-2xl mt-6 p-5 bg-purple-900/40 border border-purple-600/70 rounded-xl shadow-2xl">
        <h3 className="text-lg font-extrabold text-purple-300 mb-2">구조적 리듬 진단 (7일 평균)</h3>
        <p className="status text-xl font-semibold text-white">{status}</p>
        {current && (
          <p className="text-xs text-gray-400 mt-3">
            업데이트: {new Date(current.last_updated).toLocaleString("ko-KR")}
            {"  "}({CITY[city].name_en})
          </p>
        )}
      </div>

      {/* Footer */}
      <footer className="mt-8 mb-4 text-center">
        <p className="text-xs text-gray-500">
          &copy; 2025 Glitch Factory — Adaptive Navier Model
        </p>
      </footer>
    </div>
  );
}

