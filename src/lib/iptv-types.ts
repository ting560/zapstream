// Tipos para o sistema IPTV (Xtream Codes API)

export interface IPTVCredentials {
  server: string; // ex: https://ooo.fo
  username: string;
  password: string;
}

export interface IPTVUserInfo {
  username: string;
  password: string;
  message: string;
  auth: number;
  status: string;
  exp_date: string | null;
  is_trial: string;
  active_cons: string;
  created_at: string;
  max_connections: string;
  allowed_output_formats: string[];
}

export interface IPTVServerInfo {
  url: string;
  port: string;
  https_port: string;
  server_protocol: string;
  rtmp_port: string;
  timezone: string;
  timestamp_now: number;
  time_now: string;
}

export interface IPTVAuthResponse {
  user_info: IPTVUserInfo;
  server_info: IPTVServerInfo;
}

export interface IPTVCategory {
  category_id: string;
  category_name: string;
  parent_id: number;
}

export interface IPTVLiveStream {
  num: number;
  name: string;
  stream_type: string;
  stream_id: number;
  stream_icon: string;
  epg_channel_id: string | null;
  added: string;
  category_id: string;
  custom_sid: string;
  tv_archive: number;
  direct_source: string;
  tv_archive_duration: number;
}

export interface IPTVVodStream {
  num: number;
  name: string;
  stream_type: string;
  stream_id: number;
  stream_icon: string;
  rating: string;
  rating_5based: number;
  added: string;
  category_id: string;
  container_extension: string;
  custom_sid: string;
  direct_source: string;
}

export interface IPTVSeries {
  num: number;
  name: string;
  series_id: number;
  cover: string;
  plot: string;
  cast: string;
  director: string;
  genre: string;
  releaseDate: string;
  last_modified: string;
  rating: string;
  rating_5based: number;
  category_id: string;
}

export interface IPTVSeriesEpisode {
  id: string;
  episode_num: number;
  title: string;
  container_extension: string;
  info: {
    movie_image?: string;
    plot?: string;
    duration?: string;
    rating?: string;
    season?: number;
    tmdb_id?: string;
  };
  added: string;
  season: number;
  direct_source: string;
}

export interface IPTVSeriesInfo {
  seasons: Array<{
    season_number: number;
    name: string;
    cover: string;
    overview: string;
    air_date: string;
    episodes_count: number;
    episode_range: string;
  }>;
  info: {
    name: string;
    cover: string;
    plot: string;
    cast: string;
    director: string;
    genre: string;
    releaseDate: string;
    last_modified: string;
    rating: string;
    rating_5based: number;
    backdrop_path: string[];
    youtube_trailer: string;
    episode_run_time: string;
    category_id: string;
  };
  // Na API Xtream, episodes é um objeto cujas chaves são os números das temporadas
  episodes: Record<string, IPTVSeriesEpisode[]>;
}

export interface IPTVVodInfo {
  info: {
    movie_image: string;
    backdrop_path: string[];
    youtube_trailer: string;
    genre: string;
    plot: string;
    cast: string;
    rating: string;
    director: string;
    releasedate: string;
    tmdb_id: string;
    duration: string;
    duration_secs: number;
  };
  movie_data: {
    stream_id: number;
    name: string;
    added: string;
    category_id: string;
    container_extension: string;
    direct_source: string;
  };
}

export type ContentKind = "live" | "vod" | "series";

export interface PlayItem {
  kind: ContentKind;
  id: number | string;
  name: string;
  logo?: string;
  containerExtension?: string;
  // para series
  episode?: {
    id: string;
    title: string;
    container_extension: string;
  };
}
