import axios from 'axios';
export const api = axios.create({baseURL: import.meta.env.VITE_API_URL || 'http://localhost:8080/api/v1'});
export type Room = {id:number;propertyId:number;roomNumber:string;capacity:number;basePrice:number;status:string};
export type Property = {id:number;name:string;address:string};
export const getRooms = async ():Promise<Room[]> => (await api.get('/rooms')).data;
export const getProperties = async ():Promise<Property[]> => (await api.get('/properties')).data;
export const createProperty = async (data:{name:string;address:string}):Promise<Property> => (await api.post('/properties',data)).data;
export const createRoom = async (data:Omit<Room,'id'>):Promise<Room> => (await api.post('/rooms',data)).data;
