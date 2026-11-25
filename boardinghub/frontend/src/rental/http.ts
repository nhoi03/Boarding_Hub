import { api } from '../api';
import type { BoardingHubApi, RentalState } from './types';
export const httpApi:BoardingHubApi = {
  state:async()=>(await api.get<RentalState>('/rental/state')).data,
  execute:async(path,data)=>(await api.post(`/rental/${path}`,data ?? {})).data || {},
};
