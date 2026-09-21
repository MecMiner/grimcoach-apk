import AsyncStorage from '@react-native-async-storage/async-storage';
import { MascotConfig } from '../components/Mascot';

export interface ChildProfileData {
  id: string;
  name: string;
  nickname?: string;
  birthDate?: string;      // Formato DD/MM/AAAA
  accessCode: string;      // Código para vincular no telemóvel do pai/professor
  createdAt: string;       // Timestamp ISO da criação
  avatarIcon?: string;
  stars: number;
  score: number;
  playerLevel: number;
  unlockedItemIds: string[];
  currentConfig: MascotConfig;
  needsSync?: boolean;
}

const ACTIVE_PROFILE_KEY = '@grimcoach:active_profile_id';
const PROFILES_LIST_KEY = '@grimcoach:all_profiles_list';
const PROFILE_DATA_KEY = (id: string) => `@grimcoach:profile_${id}_data`;

export const ProfileStorage = {
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

  saveProfileData: async (data: ChildProfileData): Promise<void> => {
    try {
      await AsyncStorage.setItem(PROFILE_DATA_KEY(data.id), JSON.stringify(data));
      // Atualiza também a lista de todos os perfis locais
      const storedList = await AsyncStorage.getItem(PROFILES_LIST_KEY);
      const list: ChildProfileData[] = storedList ? JSON.parse(storedList) : [];
      const index = list.findIndex((p) => p.id === data.id);
      if (index >= 0) {
        list[index] = data;
      } else {
        list.push(data);
      }
      await AsyncStorage.setItem(PROFILES_LIST_KEY, JSON.stringify(list));
    } catch (error) {
      console.error(`Erro ao guardar dados do perfil ${data.id}:`, error);
    }
  },

  loadAllProfiles: async (fallback: ChildProfileData[]): Promise<ChildProfileData[]> => {
    try {
      const stored = await AsyncStorage.getItem(PROFILES_LIST_KEY);
      if (stored) {
        return JSON.parse(stored);
      }
      await AsyncStorage.setItem(PROFILES_LIST_KEY, JSON.stringify(fallback));
      return fallback;
    } catch {
      return fallback;
    }
  },

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