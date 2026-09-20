import AsyncStorage from '@react-native-async-storage/async-storage';
import { MascotConfig } from '../components/Mascot';

export interface ChildProfileData {
  id: string;
  name: string;
  stars: number;
  score: number;
  playerLevel: number;
  unlockedItemIds: string[];
  currentConfig: MascotConfig;
  needsSync?: boolean; // Sinalizador para sincronização posterior em segundo plano
}

const ACTIVE_PROFILE_KEY = '@grimcoach:active_profile_id';
const PROFILE_DATA_KEY = (id: string) => `@grimcoach:profile_${id}_data`;

export const ProfileStorage = {
  // Guarda ou obtém qual a criança atualmente ativa no dispositivo
  getActiveProfileId: async (): Promise<string | null> => {
    try {
      return await AsyncStorage.getItem(ACTIVE_PROFILE_KEY);
    } catch {
      return null;
    }
  },

  setActiveProfileId: async (id: string): Promise<void> => {
    try {
      await AsyncStorage.setItem(ACTIVE_PROFILE_KEY, id);
    } catch (error) {
      console.error('Erro ao definir perfil ativo:', error);
    }
  },

  // Guarda os dados específicos do perfil ativo
  saveProfileData: async (data: ChildProfileData): Promise<void> => {
    try {
      await AsyncStorage.setItem(PROFILE_DATA_KEY(data.id), JSON.stringify(data));
    } catch (error) {
      console.error(`Erro ao guardar dados do perfil ${data.id}:`, error);
    }
  },

  // Carrega os dados de um perfil com suporte a valores padrão
  loadProfileData: async (id: string, fallback: ChildProfileData): Promise<ChildProfileData> => {
    try {
      const stored = await AsyncStorage.getItem(PROFILE_DATA_KEY(id));
      if (stored) {
        return JSON.parse(stored);
      }
      await AsyncStorage.setItem(PROFILE_DATA_KEY(id), JSON.stringify(fallback));
      return fallback;
    } catch {
      return fallback;
    }
  },
};