export type WeatherData = {
    latitude: number;
    longitude: number;
    temperature: number;
    condition: string;
    condition_desc: string;
    condition_code: number;
    temperature_min: number;
    temperature_max: number;
    feels_like: number;
    pressure: number;
    humidity: number;
    wind_speed: number;
    wind_scale: number;
    wind_direction: number;
    uv: number;
    luminance: number;
    elevation: number;
    rain: number;
    wet_bulb: number;
    timestamp: number;
    timezone: number;
    location_name: string;
    address: string;
    source: string;
    tag: string;
  };

  export type WeatherForecast = WeatherForecastDP[];
  export type WeatherForecastDP = {
    latitude: number;
    longitude: number;
    temperature: number;
    condition: string;
    condition_desc: string;
    condition_code: number;
    temperature_min: number;
    temperature_max: number;
    feels_like: number;
    pressure: number;
    humidity: number;
    wind_speed: number;
    wind_direction: number;
    uv: number;
    luminance: number;
    sea_level: number;
    rain: number;
    wet_bulb: number;
    timestamp: number;
    timezone: number;
    location_name: string;
    source: string;
    tag: string;
  };