import { sql } from "drizzle-orm";
import {
  boolean,
  customType,
  index,
  integer,
  jsonb,
  pgTable,
  serial,
  text,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core";

export type SimStateJson = {
  recentTemplates?: string[];
  recentPersonas?: string[];
  clearedAtId?: number;
  lastReplyAt?: number;
};

export type DeviceCommand = {
  type: "flip" | "camera" | "torch" | "mic" | "cam" | "media";
  deviceId?: string;
  facing?: "user" | "environment";
  on?: boolean;
  media?: "video" | "audio";
  issuedAt: number;
};

export type DeviceInfo = {
  cameras: { deviceId: string; label: string; facing: "user" | "environment" | "unknown" }[];
  activeCameraId: string | null;
  activeFacing: "user" | "environment" | "unknown";
  torchSupported: boolean;
  torchOn: boolean;
  reportedAt: number;
};

export type MessageMeta = {
  sim?: boolean;
  flag?: string;
  country?: string;
  code?: string;
  city?: string;
  personaId?: string;
};

const bytea = customType<{ data: Buffer; driverData: Buffer }>({
  dataType() {
    return "bytea";
  },
  toDriver(value) {
    return Buffer.isBuffer(value) ? value : Buffer.from(value);
  },
  fromDriver(value: unknown) {
    if (Buffer.isBuffer(value)) return value;
    if (value instanceof Uint8Array) return Buffer.from(value);
    if (typeof value === "string") {
      if (value.startsWith("\\x")) return Buffer.from(value.slice(2), "hex");
      return Buffer.from(value, "base64");
    }
    return Buffer.from(value as ArrayBuffer);
  },
});

export const brand = pgTable("brand", {
  id: integer("id").primaryKey(),
  name: text("name").notNull().default("Act of Faith Chapel International"),
  tagline: text("tagline").notNull().default("Live Streaming"),
  adminPinHash: text("admin_pin_hash"),
  adminPinSalt: text("admin_pin_salt"),
  adminPinUpdatedAt: timestamp("admin_pin_updated_at", { withTimezone: true }),
  logoMime: text("logo_mime"),
  logoData: bytea("logo_data"),
  logoVersion: integer("logo_version").notNull().default(0),
  homeBannerMime: text("home_banner_mime"),
  homeBannerData: bytea("home_banner_data"),
  homeBannerVersion: integer("home_banner_version").notNull().default(0),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const streams = pgTable(
  "streams",
  {
    id: serial("id").primaryKey(),
    code: text("code").notNull(),
    title: text("title").notNull(),
    hostName: text("host_name").notNull(),
    mode: text("mode").notNull().default("video"), // video | audio
    status: text("status").notNull().default("live"), // live | ended
    phase: text("phase").notNull().default("prelive"), // prelive | onair
    tagline: text("tagline"),
    scheduledFor: text("scheduled_for"),
    coverVersion: integer("cover_version").notNull().default(0),
    startedAt: timestamp("started_at", { withTimezone: true }),
    // Simulated global audience (clearly labelled in the UI)
    simEnabled: boolean("sim_enabled").notNull().default(false),
    simFocus: text("sim_focus").notNull().default("auto"),
    simPace: text("sim_pace").notNull().default("normal"),
    simContext: text("sim_context"),
    simTranscript: text("sim_transcript"),
    simNextAt: timestamp("sim_next_at", { withTimezone: true }),
    simCount: integer("sim_count").notNull().default(0),
    simState: jsonb("sim_state")
      .$type<SimStateJson>()
      .notNull()
      .default(sql`'{}'::jsonb`),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    endedAt: timestamp("ended_at", { withTimezone: true }),
  },
  (table) => [uniqueIndex("streams_code_idx").on(table.code)],
);

export const streamCovers = pgTable("stream_covers", {
  streamId: integer("stream_id")
    .primaryKey()
    .references(() => streams.id, { onDelete: "cascade" }),
  mime: text("mime").notNull(),
  data: bytea("data").notNull(),
  width: integer("width").notNull().default(0),
  height: integer("height").notNull().default(0),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const participants = pgTable(
  "participants",
  {
    id: serial("id").primaryKey(),
    streamId: integer("stream_id")
      .notNull()
      .references(() => streams.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    token: text("token").notNull(),
    role: text("role").notNull().default("viewer"), // host | guest | viewer
    media: text("media").notNull().default("none"), // video | audio | none
    requestState: text("request_state").notNull().default("none"), // none | pending | denied
    requestedMedia: text("requested_media").notNull().default("none"),
    epoch: integer("epoch").notNull().default(1),
    micOn: boolean("mic_on").notNull().default(true),
    camOn: boolean("cam_on").notNull().default(true),
    handRaised: boolean("hand_raised").notNull().default(false),
    active: boolean("active").notNull().default(true),
    muted: boolean("muted").notNull().default(false), // chat mute by admin/host
    // Remote instructions from the admin dashboard (camera/mic/torch), consumed by the device
    command: jsonb("command").$type<DeviceCommand | null>(),
    commandSeq: integer("command_seq").notNull().default(0),
    deviceInfo: jsonb("device_info").$type<DeviceInfo | null>(),
    photoMime: text("photo_mime"),
    photoData: bytea("photo_data"),
    photoVersion: integer("photo_version").notNull().default(0),
    joinedAt: timestamp("joined_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    lastSeenAt: timestamp("last_seen_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("participants_stream_idx").on(table.streamId),
    uniqueIndex("participants_token_idx").on(table.token),
  ],
);

export const messages = pgTable(
  "messages",
  {
    id: serial("id").primaryKey(),
    streamId: integer("stream_id")
      .notNull()
      .references(() => streams.id, { onDelete: "cascade" }),
    participantId: integer("participant_id"),
    name: text("name").notNull(),
    body: text("body").notNull(),
    kind: text("kind").notNull().default("chat"), // chat | system | reaction
    origin: text("origin").notNull().default("real"), // real | sim
    avatar: text("avatar"),
    meta: jsonb("meta").$type<MessageMeta>(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [index("messages_stream_idx").on(table.streamId, table.id)],
);

export const simQueue = pgTable(
  "sim_queue",
  {
    id: serial("id").primaryKey(),
    streamId: integer("stream_id")
      .notNull()
      .references(() => streams.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    avatar: text("avatar").notNull(),
    body: text("body").notNull(),
    kind: text("kind").notNull().default("chat"),
    meta: jsonb("meta").$type<MessageMeta>().notNull(),
    deliverAt: timestamp("deliver_at", { withTimezone: true }).notNull(),
  },
  (table) => [index("sim_queue_due_idx").on(table.streamId, table.deliverAt)],
);

export const signals = pgTable(
  "signals",
  {
    id: serial("id").primaryKey(),
    streamId: integer("stream_id")
      .notNull()
      .references(() => streams.id, { onDelete: "cascade" }),
    fromId: integer("from_id").notNull(),
    toId: integer("to_id").notNull(),
    kind: text("kind").notNull(), // offer | answer | ice | bye
    epoch: integer("epoch").notNull().default(1),
    payload: jsonb("payload").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [index("signals_target_idx").on(table.streamId, table.toId)],
);

export const offerings = pgTable(
  "offerings",
  {
    id: serial("id").primaryKey(),
    streamId: integer("stream_id").references(() => streams.id, { onDelete: "set null" }),
    streamCode: text("stream_code"),
    giverName: text("giver_name").notNull(),
    email: text("email").notNull(),
    amount: integer("amount").notNull(), // smallest currency unit (pesewas / kobo)
    currency: text("currency").notNull().default("GHS"),
    reference: text("reference").notNull(),
    status: text("status").notNull().default("pending"), // pending | success | failed
    paystackId: text("paystack_id"),
    channel: text("channel"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    paidAt: timestamp("paid_at", { withTimezone: true }),
  },
  (table) => [
    uniqueIndex("offerings_reference_idx").on(table.reference),
    index("offerings_status_idx").on(table.status, table.createdAt),
  ],
);

export const ads = pgTable("ads", {
  slot: integer("slot").primaryKey(),
  mime: text("mime").notNull(),
  data: bytea("data").notNull(),
  version: integer("version").notNull().default(1),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export type Brand = typeof brand.$inferSelect;
export type Stream = typeof streams.$inferSelect;
export type StreamCover = typeof streamCovers.$inferSelect;
export type Participant = typeof participants.$inferSelect;
export type Message = typeof messages.$inferSelect;
export type Signal = typeof signals.$inferSelect;
export type Offering = typeof offerings.$inferSelect;
export type Ad = typeof ads.$inferSelect;
