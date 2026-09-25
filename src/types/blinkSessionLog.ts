import { LevelType } from '../constants/expressionAssets';

export type BlinkCommandType = 'both' | 'left' | 'right';

export interface TelemetryRoundLog {
  roundNumber: number;
  commandType: BlinkCommandType;
  targetReps: number;
  completedReps: number;
  startedAt: string;
  completedAt: string;
  durationSeconds: number;
  success: boolean;
}

export interface BlinkSessionExportPayload {
  sessionMeta: {
    sessionId: string;
    phaseId: 6;
    phaseKey: 'BlinkMechanic';
    level: LevelType;
    devicePlatform: string;
    startedAt: string;
    finishedAt: string;
    totalSessionDurationSeconds: number;
  };
  metrics: {
    totalRounds: number;
    completedRounds: number;
    totalExpectedReps: number;
    totalCompletedReps: number;
    accuracyPercentage: number;
    scoreEarned: number;
    averageResponseTimePerRoundSeconds: number;
  };
  roundsDetail: TelemetryRoundLog[];
}