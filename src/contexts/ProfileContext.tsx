import React, { createContext, useContext, useState, useEffect } from 'react';
import { ProfileStorage, ChildProfileData } from '../services/profileStorage';
import { ShopApi } from '../services/shopApi';
import { MascotConfig } from '../components/Mascot';
import { ShopItem } from '../constants/shopItems';

interface ProfileContextData {
  activeProfile: ChildProfileData;
  switchProfile: (profileId: string) => Promise<void>;
  updateMascotConfig: (newConfig: MascotConfig) => void;
  buyShopItem: (item: ShopItem) => Promise<{ success: boolean; message?: string }>;
  isLoading: boolean;
}

export const DEFAULT_PROFILE: ChildProfileData = {
  id: 'child_default_1',
  name: 'Jogador 1',
  stars: 120,
  score: 0,
  playerLevel: 3,
  unlockedItemIds: [
    'body_blueA',
    'arm_blueA',
    'leg_blueA',
    'eye_cuteLight',
    'mouth_closedHappy',
    'detail_blueAntennaLarge',
  ],
  currentConfig: {
    bodyKey: 'blueA',
    eyeKey: 'cuteLight',
    mouthKey: 'closedHappy',
    armKey: 'blueA',
    legKey: 'blueA',
    detailKey: 'blueAntennaLarge',
  },
};

const ProfileContext = createContext<ProfileContextData>({} as ProfileContextData);

export const ProfileProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Já inicia com o DEFAULT_PROFILE para nunca ser undefined
  const [activeProfile, setActiveProfile] = useState<ChildProfileData>(DEFAULT_PROFILE);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    let isMounted = true;

    const init = async () => {
      try {
        const activeId = await ProfileStorage.getActiveProfileId();
        const profileId = activeId || DEFAULT_PROFILE.id;
        const data = await ProfileStorage.loadProfileData(profileId, DEFAULT_PROFILE);
        
        if (isMounted) {
          setActiveProfile(data || DEFAULT_PROFILE);
        }
      } catch (error) {
        console.warn('Falha ao carregar perfil do storage, usando default:', error);
        if (isMounted) {
          setActiveProfile(DEFAULT_PROFILE);
        }
      } finally {
        // O finally GARANTE que nunca fica preso em true
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    init();

    return () => {
      isMounted = false;
    };
  }, []);

  const switchProfile = async (profileId: string) => {
    setIsLoading(true);
    try {
      await ProfileStorage.setActiveProfileId(profileId);
      const data = await ProfileStorage.loadProfileData(profileId, {
        ...DEFAULT_PROFILE,
        id: profileId,
        name: `Criança ${profileId}`,
      });
      setActiveProfile(data);
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  const updateMascotConfig = (newConfig: MascotConfig) => {
    setActiveProfile((prev) => {
      const updated: ChildProfileData = {
        ...prev,
        currentConfig: newConfig,
        needsSync: true,
      };
      ProfileStorage.saveProfileData(updated);
      return updated;
    });
  };

  const buyShopItem = async (item: ShopItem) => {
    if (activeProfile.stars < item.price) {
      return { success: false, message: 'Estrelas insuficientes.' };
    }

    const res = await ShopApi.purchaseItemOnServer(activeProfile.id, item.id);
    if (!res.success) {
      return res;
    }

    setActiveProfile((prev) => {
      const updated: ChildProfileData = {
        ...prev,
        stars: prev.stars - item.price,
        unlockedItemIds: [...prev.unlockedItemIds, item.id],
      };
      ProfileStorage.saveProfileData(updated);
      return updated;
    });

    return { success: true };
  };

  return (
    <ProfileContext.Provider
      value={{
        activeProfile,
        switchProfile,
        updateMascotConfig,
        buyShopItem,
        isLoading,
      }}
    >
      {children}
    </ProfileContext.Provider>
  );
};

export const useProfile = () => useContext(ProfileContext);