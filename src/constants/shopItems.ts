import { MascotConfig } from '../components/Mascot';

export interface ShopItem {
  id: string;
  category: keyof MascotConfig;
  itemKey: string;
  name: string;
  price: number;
  requiredLevel: number;
}

export const SHOP_ITEMS: ShopItem[] = [
  // --- CORPOS ---
  { id: 'b_blueA', category: 'bodyKey', itemKey: 'blueA', name: 'Azul Gotinha', price: 0, requiredLevel: 1 },
  { id: 'b_greenA', category: 'bodyKey', itemKey: 'greenA', name: 'Verde Slime', price: 15, requiredLevel: 2 },
  { id: 'b_yellowA', category: 'bodyKey', itemKey: 'yellowA', name: 'Amarelo Sol', price: 30, requiredLevel: 3 },
  { id: 'b_redA', category: 'bodyKey', itemKey: 'redA', name: 'Vermelho Fogo', price: 45, requiredLevel: 4 },
  { id: 'b_darkA', category: 'bodyKey', itemKey: 'darkA', name: 'Sombra Ninja', price: 60, requiredLevel: 5 },
  { id: 'b_whiteA', category: 'bodyKey', itemKey: 'whiteA', name: 'Nuvem Branca', price: 75, requiredLevel: 6 },

  // --- OLHOS ---
  { id: 'e_cuteLight', category: 'eyeKey', itemKey: 'cuteLight', name: 'Olhar Curioso', price: 0, requiredLevel: 1 },
  { id: 'e_closedHappy', category: 'eyeKey', itemKey: 'closedHappy', name: 'Super Feliz', price: 10, requiredLevel: 1 },
  { id: 'e_blue', category: 'eyeKey', itemKey: 'blue', name: 'Cíclope Azul', price: 20, requiredLevel: 2 },
  { id: 'e_dead', category: 'eyeKey', itemKey: 'dead', name: 'Preguicinha', price: 20, requiredLevel: 3 },
  { id: 'e_angryRed', category: 'eyeKey', itemKey: 'angryRed', name: 'Focado Rubi', price: 30, requiredLevel: 4 },
  { id: 'e_human', category: 'eyeKey', itemKey: 'human', name: 'Olhar Humano', price: 40, requiredLevel: 5 },
  { id: 'e_psychoLight', category: 'eyeKey', itemKey: 'psychoLight', name: 'Espiral Cósmico', price: 55, requiredLevel: 6 },

  // --- BOCAS ---
  { id: 'm_closedHappy', category: 'mouthKey', itemKey: 'closedHappy', name: 'Sorriso Doce', price: 0, requiredLevel: 1 },
  { id: 'm_mouthB', category: 'mouthKey', itemKey: 'mouthB', name: 'Gargalhada', price: 10, requiredLevel: 1 },
  { id: 'm_closedFangs', category: 'mouthKey', itemKey: 'closedFangs', name: 'Presinhas', price: 20, requiredLevel: 2 },
  { id: 'm_closedTeeth', category: 'mouthKey', itemKey: 'closedTeeth', name: 'Sorrisão', price: 25, requiredLevel: 3 },
  { id: 'm_closedSad', category: 'mouthKey', itemKey: 'closedSad', name: 'Tímido', price: 15, requiredLevel: 2 },
  { id: 'm_mouthF', category: 'mouthKey', itemKey: 'mouthF', name: 'Presa Dupla', price: 35, requiredLevel: 4 },

  // --- BRAÇOS ---
  { id: 'a_blueA', category: 'armKey', itemKey: 'blueA', name: 'Braços Azuis', price: 0, requiredLevel: 1 },
  { id: 'a_greenA', category: 'armKey', itemKey: 'greenA', name: 'Braços Verdes', price: 15, requiredLevel: 2 },
  { id: 'a_yellowA', category: 'armKey', itemKey: 'yellowA', name: 'Braços Dourados', price: 25, requiredLevel: 3 },
  { id: 'a_redA', category: 'armKey', itemKey: 'redA', name: 'Braços Chamas', price: 35, requiredLevel: 4 },
  { id: 'a_darkA', category: 'armKey', itemKey: 'darkA', name: 'Braços Noturnos', price: 45, requiredLevel: 5 },

  // --- PERNAS ---
  { id: 'l_blueA', category: 'legKey', itemKey: 'blueA', name: 'Patinhas Azuis', price: 0, requiredLevel: 1 },
  { id: 'l_greenA', category: 'legKey', itemKey: 'greenA', name: 'Patinhas Verdes', price: 15, requiredLevel: 2 },
  { id: 'l_yellowA', category: 'legKey', itemKey: 'yellowA', name: 'Patinhas Amarelas', price: 25, requiredLevel: 3 },
  { id: 'l_redA', category: 'legKey', itemKey: 'redA', name: 'Patinhas Fogo', price: 35, requiredLevel: 4 },
  { id: 'l_darkA', category: 'legKey', itemKey: 'darkA', name: 'Patinhas Sombra', price: 45, requiredLevel: 5 },

  // --- ACESSÓRIOS ---
  { id: 'd_blueAntennaLarge', category: 'detailKey', itemKey: 'blueAntennaLarge', name: 'Antena Radar', price: 0, requiredLevel: 1 },
  { id: 'd_blueEarRound', category: 'detailKey', itemKey: 'blueEarRound', name: 'Orelhas Redondas', price: 15, requiredLevel: 2 },
  { id: 'd_yellowHornSmall', category: 'detailKey', itemKey: 'yellowHornSmall', name: 'Chifrinho Ouro', price: 25, requiredLevel: 3 },
  { id: 'd_redHornLarge', category: 'detailKey', itemKey: 'redHornLarge', name: 'Chifre Dragão', price: 40, requiredLevel: 4 },
];