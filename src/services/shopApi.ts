import NetInfo from '@react-native-community/netinfo';
import { SHOP_ITEMS, ShopItem } from '../constants/shopItems';

export const ShopApi = {
  // Obter catálogo (online atualiza a lista; offline recorre ao ficheiro local)
  fetchCatalog: async (): Promise<ShopItem[]> => {
    const net = await NetInfo.fetch();
    const isOnline = Boolean(net.isConnected && net.isInternetReachable !== false);

    if (isOnline) {
      try {
        // Futuro: const res = await fetch('https://api.seuservidor.com/shop/catalog');
        // return await res.json();
      } catch (e) {
        console.log('Falha ao aceder à API, a usar catálogo local.');
      }
    }
    return SHOP_ITEMS;
  },

  // Processamento da compra
  purchaseItemOnServer: async (
    childId: string,
    itemId: string
  ): Promise<{ success: boolean; message?: string }> => {
    const net = await NetInfo.fetch();
    const isOnline = Boolean(net.isConnected && net.isInternetReachable !== false);

    // Regra mandatória: sem ligação, a compra não é autorizada
    if (!isOnline) {
      return {
        success: false,
        message: 'Precisas de ligação à internet para comprar itens novos na loja!',
      };
    }

    try {
      // Futuro: chamada HTTP real ao backend Node.js
      // const res = await fetch(`/api/profiles/${childId}/purchase`, { method: 'POST', body: JSON.stringify({ itemId }) });
      return { success: true };
    } catch {
      return { success: false, message: 'Erro ao processar compra no servidor.' };
    }
  },
};