import type { NavigatorScreenParams } from '@react-navigation/native';

export type AuthStackParamList = {
  Login: undefined;
  Register: undefined;
};

export type AppTabParamList = {
  AivaHome: undefined;
  AivaPlay: undefined;
  AivaSafety: undefined;
  AivaLocation: undefined;
  AivaHistory: undefined;
  AivaPair: undefined;
};

export type MainStackParamList = {
  Tabs: NavigatorScreenParams<AppTabParamList> | undefined;
  AivaAsk: undefined;
  PlaySession: {
    kind: 'hunt' | 'cards' | 'quiz' | 'story';
    packId: string;
    mode: 'solo' | 'teams';
    phoneOnly?: boolean;
  };
  PlayPackEditor: { kind: 'hunt' | 'cards' | 'quiz' | 'story'; packId?: string };
};
