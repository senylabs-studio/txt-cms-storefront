import apiClient from '../apiClient';

export interface BoardItem {
  id: number;
  variantId: number;
  variantName: string;
  thumbnailUrl?: string;
  x: number;
  y: number;
  width: number;
  height: number;
  zIndex: number;
}

export interface UpdateBoardItemData {
  x: number;
  y: number;
  width: number;
  height: number;
}

export const getBoard = async (): Promise<BoardItem[]> => {
  const res = await apiClient.get('/storefront/board');
  return res.data;
};

export const addBoardItem = async (variantId: number): Promise<BoardItem> => {
  const res = await apiClient.post('/storefront/board/items', { variantId });
  return res.data;
};

export const updateBoardItem = async (id: number, data: UpdateBoardItemData): Promise<void> => {
  await apiClient.put(`/storefront/board/items/${id}`, data);
};

export const removeBoardItem = async (id: number): Promise<void> => {
  await apiClient.delete(`/storefront/board/items/${id}`);
};
