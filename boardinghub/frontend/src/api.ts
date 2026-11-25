import axios from 'axios';
export const api = axios.create({baseURL: import.meta.env.VITE_API_URL || '/api/v1', withCredentials:true, timeout:15000});
api.interceptors.request.use(async config => {
  if (!['get', 'head', 'options'].includes(config.method?.toLowerCase() || 'get')) {
    const {data} = await api.get<{token:string;headerName:string}>('/auth/csrf');
    config.headers.set(data.headerName, data.token);
  }
  return config;
});
api.interceptors.response.use(response => response, error => {
  if (error.response?.status === 401 && !error.config?.url?.startsWith('/auth/'))
    window.dispatchEvent(new Event('boardinghub:session-expired'));
  return Promise.reject(error);
});
export type Room = {id:number;propertyId:number;roomNumber:string;capacity:number;basePrice:number;status:string};
export type Property = {id:number;name:string;address:string};
export const getRooms = async ():Promise<Room[]> => (await api.get('/rooms')).data;
export const getProperties = async ():Promise<Property[]> => (await api.get('/properties')).data;
export const createProperty = async (data:{name:string;address:string}):Promise<Property> => (await api.post('/properties',data)).data;
export const createRoom = async (data:Omit<Room,'id'>):Promise<Room> => (await api.post('/rooms',data)).data;
export const updateRoom = async (id:number, data:Omit<Room,'id'>):Promise<Room> => (await api.put(`/rooms/${id}`,data)).data;
