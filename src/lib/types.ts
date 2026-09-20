export type MediaKind = "video" | "audio" | "none";
export type Role = "host" | "guest" | "viewer";
export type SignalKind = "offer" | "answer" | "ice" | "bye";

export type PublicParticipant = {
  id: number;
  name: string;
  role: Role;
  media: MediaKind;
  epoch: number;
  micOn: boolean;
  camOn: boolean;
  handRaised: boolean;
  requestState: "none" | "pending" | "denied" | "invited";
  requestedMedia: MediaKind;
};

export type PublicMessage = {
  id: number;
  name: string;
  body: string;
  kind: "chat" | "system" | "reaction";
  participantId: number | null;
  origin: "real" | "sim";
  avatar: string | null;
  flag: string | null;
  country: string | null;
  createdAt: string;
};

export type SimFocus = "auto" | "blessing" | "healing" | "miracle" | "offering" | "prayer";
export type SimPace = "calm" | "normal" | "lively";

export type SimStatus = {
  enabled: boolean;
  focus: SimFocus;
  pace: SimPace;
  context: string | null;
  nextAt: string | null;
  count: number;
  clearedAtId: number;
};

export type IncomingSignal = {
  id: number;
  fromId: number;
  toId: number;
  kind: SignalKind;
  epoch: number;
  payload: unknown;
};

export type StreamPhase = "prelive" | "onair";

export type StreamSummary = {
  code: string;
  title: string;
  hostName: string;
  mode: "video" | "audio";
  status: "live" | "ended";
  phase: StreamPhase;
  tagline: string | null;
  scheduledFor: string | null;
  coverVersion: number;
  hasCover: boolean;
  viewers: number;
  onStage: number;
  createdAt: string;
  startedAt: string | null;
  sim: SimStatus;
};

export type DeviceCommand = {
  type: "flip" | "camera" | "torch" | "mic" | "cam" | "media";
  deviceId?: string;
  facing?: "user" | "environment";
  on?: boolean;
  media?: "video" | "audio";
  issuedAt: number;
};

export type SyncResponse = {
  stream: StreamSummary;
  me: PublicParticipant & { muted?: boolean };
  command: DeviceCommand | null;
  commandSeq: number;
  participants: PublicParticipant[];
  messages: PublicMessage[];
  signals: IncomingSignal[];
  serverTime: string;
};

export type Identity = {
  code: string;
  participantId: number;
  token: string;
  name: string;
  role: Role;
};
