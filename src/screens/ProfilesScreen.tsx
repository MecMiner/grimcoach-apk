import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Modal,
  TextInput,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { useProfile, DEFAULT_PROFILE } from '../contexts/ProfileContext';
import { ChildProfileData, ProfileStorage } from '../services/profileStorage';

const AVATAR_OPTIONS = ['🦁', '🦊', '🐻', '🐼', '🐸', '🦄', '🤖', '🚀'];

// Gerador de código de acesso simples e legível (ex: GRIM-5821)
const generateAccessCode = () => {
  const randomNum = Math.floor(1000 + Math.random() * 9000);
  return `GRIM-${randomNum}`;
};

interface ProfilesScreenProps {
  onProfileSelected: () => void;
  onLogout: () => void;
}

export const ProfilesScreen: React.FC<ProfilesScreenProps> = ({
  onProfileSelected,
  onLogout,
}) => {
  const { switchProfile } = useProfile();

  const [profiles, setProfiles] = useState<ChildProfileData[]>([]);
  const [modalVisible, setModalVisible] = useState(false);

  // Campos do formulário de criação
  const [name, setName] = useState('');
  const [nickname, setNickname] = useState('');
  const [birthDate, setBirthDate] = useState('');
  const [selectedAvatar, setSelectedAvatar] = useState('🦁');
  const [errorText, setErrorText] = useState('');

  // Carrega todos os perfis salvos localmente
  useEffect(() => {
    const loadProfiles = async () => {
      const initialFallback: ChildProfileData = {
        ...DEFAULT_PROFILE,
        id: 'child_1',
        name: 'Lucas',
        nickname: 'Luquinhas',
        birthDate: '12/05/2018',
        accessCode: 'GRIM-1001',
        createdAt: new Date().toISOString(),
        avatarIcon: '🦁',
      };
      const list = await ProfileStorage.loadAllProfiles([initialFallback]);
      setProfiles(list);
    };
    loadProfiles();
  }, []);

  // Máscara simples para data (DD/MM/AAAA)
  const handleDateChange = (text: string) => {
    const cleaned = text.replace(/\D/g, '');
    let formatted = cleaned;
    if (cleaned.length > 2 && cleaned.length <= 4) {
      formatted = `${cleaned.slice(0, 2)}/${cleaned.slice(2)}`;
    } else if (cleaned.length > 4) {
      formatted = `${cleaned.slice(0, 2)}/${cleaned.slice(2, 4)}/${cleaned.slice(4, 8)}`;
    }
    setBirthDate(formatted);
  };

  const handleSelectChild = async (profileId: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    await switchProfile(profileId);
    onProfileSelected();
  };

  const handleCreateProfile = async () => {
    if (!name.trim()) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      setErrorText('Por favor, indica o nome da criança.');
      return;
    }

    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

    const generatedCode = generateAccessCode();
    const nowISO = new Date().toISOString();

    const newProfile: ChildProfileData = {
      ...DEFAULT_PROFILE,
      id: `child_${Date.now()}`,
      name: name.trim(),
      nickname: nickname.trim() || name.trim(),
      birthDate: birthDate.trim() || 'Não informada',
      accessCode: generatedCode,
      createdAt: nowISO,
      avatarIcon: selectedAvatar,
      stars: 100,
      score: 0,
      playerLevel: 1,
    };

    await ProfileStorage.saveProfileData(newProfile);
    setProfiles((prev) => [...prev, newProfile]);

    // Limpa campos
    setName('');
    setNickname('');
    setBirthDate('');
    setErrorText('');
    setModalVisible(false);

    // Seleciona a criança imediatamente para iniciar o jogo
    await switchProfile(newProfile.id);
    onProfileSelected();
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        {/* Cabeçalho */}
        <View style={styles.topBar}>
          <Text style={styles.appTitle}>Quem vai jogar?</Text>
          <TouchableOpacity
            style={styles.logoutBtn}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              onLogout();
            }}
          >
            <Text style={styles.logoutText}>Sair</Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.instruction}>
          Toca no perfil para começar a aventura!
        </Text>

        {/* Grade de Perfis */}
        <ScrollView contentContainerStyle={styles.profilesGrid} showsVerticalScrollIndicator={false}>
          {profiles.map((p) => (
            <TouchableOpacity
              key={p.id}
              style={styles.profileCard}
              onPress={() => handleSelectChild(p.id)}
              activeOpacity={0.85}
            >
              <View style={styles.avatarCircle}>
                <Text style={styles.avatarEmoji}>{p.avatarIcon || '👾'}</Text>
              </View>
              <Text style={styles.profileName} numberOfLines={1}>
                {p.nickname || p.name}
              </Text>
              <View style={styles.codePill}>
                <Text style={styles.codeText}>Código: {p.accessCode}</Text>
              </View>
              <View style={styles.starsBadge}>
                <Text style={styles.starsText}>⭐ {p.stars}</Text>
              </View>
            </TouchableOpacity>
          ))}

          {/* Botão Novo Jogador */}
          <TouchableOpacity
            style={styles.addProfileCard}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              setModalVisible(true);
            }}
            activeOpacity={0.85}
          >
            <View style={styles.addCircle}>
              <Text style={styles.addIcon}>＋</Text>
            </View>
            <Text style={styles.addText}>Novo Jogador</Text>
          </TouchableOpacity>
        </ScrollView>

        {/* Modal de Criação */}
        <Modal visible={modalVisible} transparent animationType="slide">
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            style={styles.modalOverlay}
          >
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Registar Novo Jogador</Text>
                <TouchableOpacity
                  onPress={() => setModalVisible(false)}
                  style={styles.modalCloseBtn}
                >
                  <Text style={styles.modalCloseText}>✕</Text>
                </TouchableOpacity>
              </View>

              <ScrollView showsVerticalScrollIndicator={false}>
                {errorText ? (
                  <View style={styles.errorBox}>
                    <Text style={styles.errorText}>{errorText}</Text>
                  </View>
                ) : null}

                <Text style={styles.inputLabel}>NOME COMPLETO *</Text>
                <TextInput
                  style={styles.modalInput}
                  placeholder="Ex: João Silva"
                  placeholderTextColor="#A89A8D"
                  value={name}
                  onChangeText={(t) => {
                    setName(t);
                    setErrorText('');
                  }}
                />

                <Text style={styles.inputLabel}>APELIDO / COMO GOSTA DE SER CHAMADO</Text>
                <TextInput
                  style={styles.modalInput}
                  placeholder="Ex: Joca"
                  placeholderTextColor="#A89A8D"
                  value={nickname}
                  onChangeText={setNickname}
                />

                <Text style={styles.inputLabel}>DATA DE NASCIMENTO (DD/MM/AAAA)</Text>
                <TextInput
                  style={styles.modalInput}
                  placeholder="DD/MM/AAAA"
                  placeholderTextColor="#A89A8D"
                  value={birthDate}
                  onChangeText={handleDateChange}
                  keyboardType="numeric"
                  maxLength={10}
                />

                <Text style={styles.inputLabel}>ESCOLHE O AVATAR</Text>
                <View style={styles.avatarsRow}>
                  {AVATAR_OPTIONS.map((emoji) => (
                    <TouchableOpacity
                      key={emoji}
                      style={[
                        styles.avatarSelectBtn,
                        selectedAvatar === emoji && styles.avatarSelectBtnActive,
                      ]}
                      onPress={() => {
                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                        setSelectedAvatar(emoji);
                      }}
                    >
                      <Text style={styles.avatarChoiceEmoji}>{emoji}</Text>
                    </TouchableOpacity>
                  ))}
                </View>

                <View style={styles.infoNote}>
                  <Text style={styles.infoNoteText}>
                    💡 Um código de acesso único será gerado automaticamente para que o pai ou professor possa aceder a este mesmo perfil noutro dispositivo.
                  </Text>
                </View>

                <TouchableOpacity
                  style={styles.createBtn}
                  onPress={handleCreateProfile}
                  activeOpacity={0.85}
                >
                  <Text style={styles.createBtnText}>GUARDAR E COMEÇAR 🎉</Text>
                </TouchableOpacity>
              </ScrollView>
            </View>
          </KeyboardAvoidingView>
        </Modal>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#F7F2EB',
  },
  container: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 10,
  },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  appTitle: {
    fontSize: 24,
    fontWeight: '900',
    color: '#4A3525',
  },
  logoutBtn: {
    backgroundColor: '#EDE3D5',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: '#DFD1BF',
  },
  logoutText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#7C6758',
  },
  instruction: {
    fontSize: 13,
    fontWeight: '700',
    color: '#7C6758',
    marginBottom: 16,
  },
  profilesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 14,
    paddingBottom: 40,
  },
  profileCard: {
    width: '47.5%',
    backgroundColor: '#FFFFFF',
    borderRadius: 22,
    borderWidth: 2.5,
    borderColor: '#E2D5C5',
    padding: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#EFE5D8',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
    borderWidth: 2,
    borderColor: '#DFD1BF',
  },
  avatarEmoji: {
    fontSize: 30,
  },
  profileName: {
    fontSize: 15,
    fontWeight: '900',
    color: '#4A3525',
    marginBottom: 4,
  },
  codePill: {
    backgroundColor: '#EFEAE1',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
    marginBottom: 6,
  },
  codeText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#7C6758',
  },
  starsBadge: {
    backgroundColor: '#FAF5EE',
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E2D5C5',
  },
  starsText: {
    fontSize: 11,
    fontWeight: '900',
    color: '#4A3525',
  },
  addProfileCard: {
    width: '47.5%',
    backgroundColor: '#FAF5EE',
    borderRadius: 22,
    borderWidth: 2.5,
    borderColor: '#D9C8B4',
    borderStyle: 'dashed',
    padding: 14,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 150,
  },
  addCircle: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#EFE5D8',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  addIcon: {
    fontSize: 26,
    fontWeight: '900',
    color: '#7C6758',
  },
  addText: {
    fontSize: 13,
    fontWeight: '900',
    color: '#7C6758',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 10, 8, 0.75)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#FAF5EE',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    borderWidth: 3,
    borderColor: '#4A3525',
    padding: 20,
    maxHeight: '85%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '900',
    color: '#4A3525',
  },
  modalCloseBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#E5D6C5',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: '#4A3525',
  },
  modalCloseText: {
    fontSize: 14,
    fontWeight: '900',
    color: '#4A3525',
  },
  inputLabel: {
    fontSize: 11,
    fontWeight: '900',
    color: '#7C6758',
    marginBottom: 5,
    letterSpacing: 0.3,
  },
  modalInput: {
    backgroundColor: '#FFFFFF',
    borderWidth: 2,
    borderColor: '#E2D5C5',
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 9,
    fontSize: 14,
    color: '#4A3525',
    fontWeight: '700',
    marginBottom: 12,
  },
  errorBox: {
    backgroundColor: '#FDEEE8',
    borderWidth: 1.5,
    borderColor: '#E07A5F',
    borderRadius: 12,
    padding: 8,
    marginBottom: 12,
  },
  errorText: {
    color: '#E07A5F',
    fontSize: 12,
    fontWeight: '800',
    textAlign: 'center',
  },
  avatarsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 14,
  },
  avatarSelectBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#FFFFFF',
    borderWidth: 2,
    borderColor: '#E2D5C5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarSelectBtnActive: {
    backgroundColor: '#FDEEE8',
    borderColor: '#E07A5F',
    borderWidth: 2.5,
  },
  avatarChoiceEmoji: {
    fontSize: 20,
  },
  infoNote: {
    backgroundColor: '#EFE8DE',
    padding: 10,
    borderRadius: 12,
    marginBottom: 16,
  },
  infoNoteText: {
    fontSize: 11,
    color: '#7C6758',
    fontWeight: '600',
    lineHeight: 16,
  },
  createBtn: {
    backgroundColor: '#E07A5F',
    borderRadius: 16,
    borderWidth: 2.5,
    borderColor: '#4A3525',
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  createBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '900',
  },
});