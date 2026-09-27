/**
 * WeatherWorks 비작업일수 및 공기 산정 엔진 (코랩 정밀 분석 모델 기준)
 */

// 코랩 정밀 분석 기본 기상 판정 기준
const COLAB_WEATHER_CRITERIA = {
  workHours: { start: 7, end: 17, total: 10 }, // 07:00 ~ 17:00 가동
  rain: { thresholdMmPerHour: 1.0, consecutiveHours: 2, penaltyDays: 0.5 }, // 2시간 연속 1mm 이상 시 반일
  wind: { speedMs: 15.0, penaltyDays: 0.5 }, // 순간/시간 풍속 15m/s 이상 시 반일
  heat: { mildTw: 35.0, severeTw: 38.0 }, // 35도(14~17시 중지 0.3일), 38도(전일 중지 1.0일)
  cold: { minTemp: -12.0, penaltyDays: 1.0 }, // 일 최저 -12도 이하 전일
  snow: { depthCm: 5.0, penaltyDays: 1.0 } // 일 최고 적설 5cm 이상 전일
};

/**
 * 일별 기상 관측치 기반 비작업일(손실일수) 판정 (0 ~ 1.0일)
 */
function evaluateDailyWeatherLoss(weatherDay) {
  if (!weatherDay) return 0;

  let loss = 0;

  // 1. 혹한 판정 (일 최저 -12도 이하 -> 전일 작업 불가)
  if (weatherDay.tMin !== undefined && weatherDay.tMin <= COLAB_WEATHER_CRITERIA.cold.minTemp) {
    return 1.0;
  }

  // 2. 폭설 판정 (일 최고 적설 5cm 이상 -> 전일 작업 불가)
  if (weatherDay.snowMax !== undefined && weatherDay.snowMax >= COLAB_WEATHER_CRITERIA.snow.depthCm) {
    return 1.0;
  }

  // 3. 폭염 판정 (체감온도 38도 이상 전일, 35도 이상 0.3일)
  const tw = weatherDay.twMax || weatherDay.tMax || 0;
  if (tw >= COLAB_WEATHER_CRITERIA.heat.severeTw) {
    return 1.0;
  } else if (tw >= COLAB_WEATHER_CRITERIA.heat.mildTw) {
    loss = Math.max(loss, 0.35); // 14~17시 가동 중지
  }

  // 4. 지속성 강우 판정 (시간당 1mm 이상 2시간 연속 발생 시 반일)
  if (weatherDay.hourlyRain && Array.isArray(weatherDay.hourlyRain)) {
    let consecutive = 0;
    for (let r of weatherDay.hourlyRain) {
      if (r >= COLAB_WEATHER_CRITERIA.rain.thresholdMmPerHour) {
        consecutive++;
        if (consecutive >= COLAB_WEATHER_CRITERIA.rain.consecutiveHours) {
          loss = Math.max(loss, COLAB_WEATHER_CRITERIA.rain.penaltyDays);
          break;
        }
      } else {
        consecutive = 0;
      }
    }
  } else if (weatherDay.rainSum && weatherDay.rainSum >= 10.0) {
    loss = Math.max(loss, 0.5);
  }

  // 5. 강풍 판정 (15m/s 이상 반일 중지)
  const maxWind = weatherDay.windMax || 0;
  if (maxWind >= COLAB_WEATHER_CRITERIA.wind.speedMs) {
    loss = Math.max(loss, COLAB_WEATHER_CRITERIA.wind.penaltyDays);
  }

  return Math.min(1.0, loss);
}

/**
 * 공사기간 및 비작업일수 총괄 산출
 */
function estimateDuration(project, db, requiredWorkDaysOverride) {
  if (!project) return { requiredWorkDays: 0, nonWorkingDays: 0, estimatedCalendarDays: 0 };

  const start = new Date(project.startDate);
  const end = new Date(project.endDate);
  const totalCalendarDays = Math.max(1, Math.round((end - start) / (1000 * 60 * 60 * 24)));

  // 필요 작업일수 (오버라이드 또는 등록된 물량 기반)
  let requiredWorkDays = requiredWorkDaysOverride || 0;
  if (!requiredWorkDays && db && db.quantities) {
    const pQuants = db.quantities.filter(q => q.projectId === project.id);
    requiredWorkDays = pQuants.reduce((sum, q) => sum + (q.dailyOutput ? Math.ceil(q.quantity / q.dailyOutput) : 0), 0);
  }
  if (!requiredWorkDays) requiredWorkDays = Math.round(totalCalendarDays * 0.65);

  // 법정 공휴일 및 일요일 (기본 휴일 비작업일)
  const sundays = Math.floor(totalCalendarDays / 7);
  const holidaysCount = (db && db.holidays) ? db.holidays.length : 15;
  const legalNonWorkingDays = Math.round(sundays + (holidaysCount * (totalCalendarDays / 365)));

  // 기상 비작업일수 (코랩 모델 시뮬레이션 기반 계수: 연평균 약 60~75일 반영)
  const weatherNonWorkingDays = Math.round(totalCalendarDays * (68 / 365));

  // 중복 배제 (휴일과 기상 악천후 중복 계수 약 15% 감안)
  const overlapDays = Math.round(Math.min(legalNonWorkingDays, weatherNonWorkingDays) * 0.18);
  const netNonWorkingDays = legalNonWorkingDays + weatherNonWorkingDays - overlapDays;

  const estimatedCalendarDays = requiredWorkDays + netNonWorkingDays;

  return {
    totalCalendarDays,
    requiredWorkDays,
    legalNonWorkingDays,
    weatherNonWorkingDays,
    overlapDays,
    nonWorkingDays: netNonWorkingDays,
    estimatedCalendarDays
  };
}