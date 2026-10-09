import { relations, sql } from "drizzle-orm";
import {
  boolean,
  date,
  index,
  integer,
  pgEnum,
  pgTable,
  primaryKey,
  text,
  time,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

// Источник истины: docs/architecture/erd.md

export const userThemeEnum = pgEnum("user_theme", ["system", "light", "dark"]);
export const taskPriorityEnum = pgEnum("task_priority", ["none", "low", "medium", "high"]);
export const listKindEnum = pgEnum("list_kind", ["inbox", "regular"]);
export const habitTypeEnum = pgEnum("habit_type", ["check", "number"]);

const timestamps = {
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
};

export const users = pgTable(
  "users",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    email: text("email").notNull(),
    passwordHash: text("password_hash"),
    name: text("name").notNull(),
    timezone: text("timezone").notNull().default("UTC"),
    theme: userThemeEnum("theme").notNull().default("system"),
    avatarUrl: text("avatar_url"),
    ...timestamps,
  },
  (t) => [uniqueIndex("users_email_lower_idx").on(sql`lower(${t.email})`)],
);

export const oauthAccounts = pgTable(
  "oauth_accounts",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    provider: text("provider").notNull(),
    providerAccountId: text("provider_account_id").notNull(),
    email: text("email"),
    ...timestamps,
  },
  (t) => [
    uniqueIndex("oauth_provider_account_idx").on(t.provider, t.providerAccountId),
    index("oauth_user_idx").on(t.userId),
  ],
);

export const refreshTokens = pgTable(
  "refresh_tokens",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    tokenHash: text("token_hash").notNull(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    revokedAt: timestamp("revoked_at", { withTimezone: true }),
    userAgent: text("user_agent"),
    ...timestamps,
  },
  (t) => [
    uniqueIndex("refresh_tokens_hash_idx").on(t.tokenHash),
    index("refresh_tokens_user_idx").on(t.userId),
  ],
);

export const folders = pgTable(
  "folders",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    position: integer("position").notNull(),
    ...timestamps,
  },
  (t) => [index("folders_user_idx").on(t.userId, t.position)],
);

export const lists = pgTable(
  "lists",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    folderId: uuid("folder_id").references(() => folders.id, { onDelete: "set null" }),
    name: text("name").notNull(),
    color: text("color").notNull().default("gray"),
    emoji: text("emoji"),
    kind: listKindEnum("kind").notNull().default("regular"),
    position: integer("position").notNull(),
    trashedAt: timestamp("trashed_at", { withTimezone: true }),
    ...timestamps,
  },
  (t) => [
    uniqueIndex("lists_inbox_per_user_idx")
      .on(t.userId)
      .where(sql`${t.kind} = 'inbox'`),
    index("lists_user_idx").on(t.userId, t.position),
  ],
);

export const sections = pgTable(
  "sections",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    listId: uuid("list_id")
      .notNull()
      .references(() => lists.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    position: integer("position").notNull(),
    ...timestamps,
  },
  (t) => [index("sections_list_idx").on(t.listId, t.position)],
);

export const tasks = pgTable(
  "tasks",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    listId: uuid("list_id")
      .notNull()
      .references(() => lists.id, { onDelete: "cascade" }),
    sectionId: uuid("section_id").references(() => sections.id, { onDelete: "set null" }),
    title: text("title").notNull(),
    description: text("description").notNull().default(""),
    priority: taskPriorityEnum("priority").notNull().default("none"),
    // Календарный день и время в таймзоне пользователя; dueTime = null — «весь день».
    dueDate: date("due_date", { mode: "string" }),
    dueTime: time("due_time"),
    // Повтор: RFC 5545 без DTSTART (DTSTART = rruleStartDate). dueDate всегда следующее вхождение.
    rrule: text("rrule"),
    rruleStartDate: date("rrule_start_date", { mode: "string" }),
    pinned: boolean("pinned").notNull().default(false),
    position: integer("position").notNull(),
    completedAt: timestamp("completed_at", { withTimezone: true }),
    trashedAt: timestamp("trashed_at", { withTimezone: true }),
    ...timestamps,
  },
  (t) => [
    index("tasks_user_due_idx").on(t.userId, t.dueDate),
    index("tasks_user_list_idx").on(t.userId, t.listId),
    index("tasks_user_completed_idx").on(t.userId, t.completedAt),
    index("tasks_user_pinned_idx").on(t.userId, t.pinned),
    index("tasks_title_trgm_idx").using("gin", sql`${t.title} gin_trgm_ops`),
    index("tasks_description_trgm_idx").using("gin", sql`${t.description} gin_trgm_ops`),
  ],
);

export const subtasks = pgTable(
  "subtasks",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    taskId: uuid("task_id")
      .notNull()
      .references(() => tasks.id, { onDelete: "cascade" }),
    title: text("title").notNull(),
    done: boolean("done").notNull().default(false),
    position: integer("position").notNull(),
    ...timestamps,
  },
  (t) => [index("subtasks_task_idx").on(t.taskId, t.position)],
);

export const tags = pgTable(
  "tags",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    position: integer("position").notNull(),
    ...timestamps,
  },
  (t) => [uniqueIndex("tags_user_name_lower_idx").on(t.userId, sql`lower(${t.name})`)],
);

export const taskTags = pgTable(
  "task_tags",
  {
    taskId: uuid("task_id")
      .notNull()
      .references(() => tasks.id, { onDelete: "cascade" }),
    tagId: uuid("tag_id")
      .notNull()
      .references(() => tags.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [primaryKey({ columns: [t.taskId, t.tagId] })],
);

export const taskCompletions = pgTable(
  "task_completions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    taskId: uuid("task_id")
      .notNull()
      .references(() => tasks.id, { onDelete: "cascade" }),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    occurrenceDate: date("occurrence_date", { mode: "string" }).notNull(),
    completedAt: timestamp("completed_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("task_completions_user_idx").on(t.userId, t.completedAt),
    index("task_completions_task_idx").on(t.taskId),
  ],
);

export const reminders = pgTable(
  "reminders",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    taskId: uuid("task_id")
      .notNull()
      .references(() => tasks.id, { onDelete: "cascade" }),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    // Смещение от времени задачи в минутах (0 = в момент времени).
    offsetMinutes: integer("offset_minutes").notNull(),
    // Для какого вхождения (dueDate задачи) уже отправлено; сбрасывается при смене даты задачи.
    sentOccurrenceDate: date("sent_occurrence_date", { mode: "string" }),
    ...timestamps,
  },
  (t) => [index("reminders_task_idx").on(t.taskId), index("reminders_user_idx").on(t.userId)],
);

export const attachments = pgTable(
  "attachments",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    taskId: uuid("task_id")
      .notNull()
      .references(() => tasks.id, { onDelete: "cascade" }),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    fileName: text("file_name").notNull(),
    mimeType: text("mime_type").notNull(),
    sizeBytes: integer("size_bytes").notNull(),
    storageKey: text("storage_key").notNull(),
    uploadedAt: timestamp("uploaded_at", { withTimezone: true }),
    ...timestamps,
  },
  (t) => [
    index("attachments_task_idx").on(t.taskId),
    index("attachments_user_idx").on(t.userId),
    index("attachments_unconfirmed_idx")
      .on(t.createdAt)
      .where(sql`${t.uploadedAt} is null`),
  ],
);

export const pushSubscriptions = pgTable(
  "push_subscriptions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    endpoint: text("endpoint").notNull(),
    p256dh: text("p256dh").notNull(),
    auth: text("auth").notNull(),
    userAgent: text("user_agent"),
    ...timestamps,
  },
  (t) => [
    uniqueIndex("push_subscriptions_endpoint_idx").on(t.endpoint),
    index("push_subscriptions_user_idx").on(t.userId),
  ],
);

export const habits = pgTable(
  "habits",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    type: habitTypeEnum("type").notNull().default("check"),
    // Только для type='number': цель в день.
    targetValue: integer("target_value"),
    // Битовая маска пн..вс (бит 0 = понедельник, 127 = все дни).
    daysOfWeek: integer("days_of_week").notNull().default(127),
    color: text("color").notNull().default("gray"),
    position: integer("position").notNull(),
    archivedAt: timestamp("archived_at", { withTimezone: true }),
    ...timestamps,
  },
  (t) => [index("habits_user_idx").on(t.userId, t.position)],
);

export const habitEntries = pgTable(
  "habit_entries",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    habitId: uuid("habit_id")
      .notNull()
      .references(() => habits.id, { onDelete: "cascade" }),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    // Локальный день пользователя (YYYY-MM-DD).
    date: date("date", { mode: "string" }).notNull(),
    value: integer("value").notNull().default(1),
    ...timestamps,
  },
  (t) => [
    uniqueIndex("habit_entries_habit_date_idx").on(t.habitId, t.date),
    index("habit_entries_user_date_idx").on(t.userId, t.date),
  ],
);

// --- Связи (для query API Drizzle) ---

export const usersRelations = relations(users, ({ many }) => ({
  lists: many(lists),
  tasks: many(tasks),
  tags: many(tags),
  habits: many(habits),
}));

export const foldersRelations = relations(folders, ({ one, many }) => ({
  user: one(users, { fields: [folders.userId], references: [users.id] }),
  lists: many(lists),
}));

export const listsRelations = relations(lists, ({ one, many }) => ({
  user: one(users, { fields: [lists.userId], references: [users.id] }),
  folder: one(folders, { fields: [lists.folderId], references: [folders.id] }),
  sections: many(sections),
  tasks: many(tasks),
}));

export const sectionsRelations = relations(sections, ({ one }) => ({
  list: one(lists, { fields: [sections.listId], references: [lists.id] }),
}));

export const tasksRelations = relations(tasks, ({ one, many }) => ({
  user: one(users, { fields: [tasks.userId], references: [users.id] }),
  list: one(lists, { fields: [tasks.listId], references: [lists.id] }),
  section: one(sections, { fields: [tasks.sectionId], references: [sections.id] }),
  subtasks: many(subtasks),
  taskTags: many(taskTags),
  reminders: many(reminders),
  attachments: many(attachments),
  completions: many(taskCompletions),
}));

export const subtasksRelations = relations(subtasks, ({ one }) => ({
  task: one(tasks, { fields: [subtasks.taskId], references: [tasks.id] }),
}));

export const tagsRelations = relations(tags, ({ one, many }) => ({
  user: one(users, { fields: [tags.userId], references: [users.id] }),
  taskTags: many(taskTags),
}));

export const taskTagsRelations = relations(taskTags, ({ one }) => ({
  task: one(tasks, { fields: [taskTags.taskId], references: [tasks.id] }),
  tag: one(tags, { fields: [taskTags.tagId], references: [tags.id] }),
}));

export const taskCompletionsRelations = relations(taskCompletions, ({ one }) => ({
  task: one(tasks, { fields: [taskCompletions.taskId], references: [tasks.id] }),
}));

export const remindersRelations = relations(reminders, ({ one }) => ({
  task: one(tasks, { fields: [reminders.taskId], references: [tasks.id] }),
}));

export const attachmentsRelations = relations(attachments, ({ one }) => ({
  task: one(tasks, { fields: [attachments.taskId], references: [tasks.id] }),
}));

export const habitsRelations = relations(habits, ({ one, many }) => ({
  user: one(users, { fields: [habits.userId], references: [users.id] }),
  entries: many(habitEntries),
}));

export const habitEntriesRelations = relations(habitEntries, ({ one }) => ({
  habit: one(habits, { fields: [habitEntries.habitId], references: [habits.id] }),
}));
