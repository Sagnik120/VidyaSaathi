/**
 * VidyaSaathi API client. Framework-free (no React/DOM beyond fetch and
 * localStorage), so a React Native app can reuse it with its own storage.
 *
 * Every call hits the real backend — there is no mock fallback: if the
 * server is unreachable the UI must say so rather than show invented data.
 */
import type {
  Dashboard, Lesson, LessonDetail, LessonList, PracticeSet, PracticeResult, User, TokenResponse,
  DocumentInfo, AdminOverview, AdminLive, AdminEscalations, AdminInsights, AdminQuality,
  AdminPipeline, AdminLearners, AdminLearnerDetail, AdminStaff, Analytics, SavedNote, Journey,
  SkillConcept, SkillMap, Placement, PlacementAnswer, PlacementStep, WhyEntry, ReviewDue, ReviewSet, ReviewResult,
  SyllabusPath, BoardsInfo, DoubtThread, MyTeachers, ClassTest, LeaderRow, StudentTestReport, TeacherTestReport,
  TeacherStudents, TeacherStudentDetail, Teaching, AppNotification, DoubtQuery, DoubtStats, TeacherOverview, GameBoard, TestBoard, Journey2, JourneyStage,
} from "./types";

export const BACKEND_ORIGIN = (process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:8000").replace(/\/+$/, "");
export const API_BASE = `${BACKEND_ORIGIN}/api/v1`;

const ACCESS_KEY = "shikshak.access";
const REFRESH_KEY = "shikshak.refresh";
const USER_KEY = "shikshak.user";

/** Error carrying the HTTP status so callers can branch on it. */
export class ApiError extends Error {
  status: number;
  body: unknown;
  constructor(message: string, status: number, body: unknown) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.body = body;
  }
}

/* -- token storage --------------------------------------------------------- */

function safeGet(key: string): string | null {
  try {
    return typeof localStorage === "undefined" ? null : localStorage.getItem(key);
  } catch {
    return null;
  }
}
function safeSet(key: string, value: string | null | undefined) {
  try {
    if (value === undefined || value === null) return;
    localStorage.setItem(key, value);
  } catch {
    /* private mode: the session simply won't persist across reloads */
  }
}

const listeners = new Set<() => void>();
function notify() {
  listeners.forEach((fn) => fn());
}

export const tokens = {
  get access() { return safeGet(ACCESS_KEY); },
  get refresh() { return safeGet(REFRESH_KEY); },
  get user(): User | null {
    try { return JSON.parse(safeGet(USER_KEY) || "null"); } catch { return null; }
  },
  save({ access_token, refresh_token, user }: Partial<TokenResponse>) {
    safeSet(ACCESS_KEY, access_token);
    safeSet(REFRESH_KEY, refresh_token);
    if (user) safeSet(USER_KEY, JSON.stringify(user));
    notify();
  },
  saveUser(user: User) {
    safeSet(USER_KEY, JSON.stringify(user));
    notify();
  },
  clear() {
    [ACCESS_KEY, REFRESH_KEY, USER_KEY].forEach((k) => {
      try { localStorage.removeItem(k); } catch { /* nothing to clean up */ }
    });
    notify();
  },
  get isSignedIn() { return Boolean(this.access && this.refresh); },
  subscribe(fn: () => void) {
    listeners.add(fn);
    return () => listeners.delete(fn);
  },
};

/* -- request pipeline ------------------------------------------------------ */

// Concurrent 401s must not each fire their own refresh, or they race and
// invalidate one another's rotated token.
let refreshInFlight: Promise<string | null> | null = null;

async function refreshAccessToken(): Promise<string | null> {
  if (refreshInFlight) return refreshInFlight;
  const refreshToken = tokens.refresh;
  if (!refreshToken) return null;
  refreshInFlight = (async () => {
    try {
      const response = await fetch(`${API_BASE}/auth/refresh`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ refresh_token: refreshToken }),
      });
      if (!response.ok) return null;
      const data = await response.json();
      tokens.save(data);
      return data.access_token as string;
    } catch {
      return null;
    } finally {
      refreshInFlight = null;
    }
  })();
  return refreshInFlight;
}

async function parseBody(response: Response): Promise<unknown> {
  const type = response.headers.get("content-type") || "";
  if (type.includes("application/json")) {
    try { return await response.json(); } catch { return null; }
  }
  return null;
}

/** A message code the UI translates; falls back to the server's own words. */
export function messageFor(status: number, body: unknown): string {
  const detail = (body as { detail?: unknown } | null)?.detail;
  if (typeof detail === "string") return detail;
  if (Array.isArray(detail) && detail.length) return (detail[0] as { msg?: string }).msg || "Invalid request.";
  if (status === 0) return "network";
  if (status === 404) return "Not found.";
  if (status === 429) return "Too many attempts. Please wait a moment.";
  if (status >= 500) return "The server hit an error. Please try again.";
  return `Request failed (${status}).`;
}

/** Called when a session can't be refreshed — the app routes to login. */
let onSessionExpired: () => void = () => {};
export function setSessionExpiredHandler(fn: () => void) {
  onSessionExpired = fn;
}

type RequestOptions = { method?: string; body?: unknown; auth?: boolean; isForm?: boolean; retry?: boolean };

export async function request<T = unknown>(path: string, opts: RequestOptions = {}): Promise<T> {
  const { method = "GET", body, auth = true, isForm = false, retry = true } = opts;
  const headers: Record<string, string> = {};
  if (auth && tokens.access) headers.Authorization = `Bearer ${tokens.access}`;
  if (body !== undefined && !isForm) headers["Content-Type"] = "application/json";

  let response: Response;
  try {
    response = await fetch(`${API_BASE}${path}`, {
      method,
      headers,
      body: isForm ? (body as BodyInit) : body !== undefined ? JSON.stringify(body) : undefined,
    });
  } catch {
    throw new ApiError(messageFor(0, null), 0, null);
  }

  // One transparent refresh-and-retry when the access token has expired.
  if (response.status === 401 && auth && retry && tokens.refresh) {
    const fresh = await refreshAccessToken();
    if (fresh) return request<T>(path, { ...opts, retry: false });
    tokens.clear();
    onSessionExpired();
    throw new ApiError("Your session expired. Please sign in again.", 401, null);
  }

  const data = await parseBody(response);
  if (!response.ok) throw new ApiError(messageFor(response.status, data), response.status, data);
  return data as T;
}

/* -- endpoints ------------------------------------------------------------- */

const enc = encodeURIComponent;

export const api = {
  // auth
  signup: (payload: Record<string, unknown>) =>
    request<{ message: string; dev_otp?: string }>("/auth/signup", { method: "POST", body: payload, auth: false }),
  signupStaff: (payload: Record<string, unknown>) =>
    request<{ message: string; dev_otp?: string }>("/auth/signup-staff", { method: "POST", body: payload, auth: false }),
  verifyEmail: (email: string, code: string) =>
    request<TokenResponse>("/auth/verify-email", { method: "POST", body: { email, code }, auth: false }),
  resendOtp: (email: string, purpose: "verify_email" | "reset_password" = "verify_email") =>
    request<{ message: string; dev_otp?: string }>("/auth/resend-otp", { method: "POST", body: { email, purpose }, auth: false }),
  login: (email: string, password: string) =>
    request<TokenResponse>("/auth/login", { method: "POST", body: { email, password }, auth: false }),
  forgotPassword: (email: string) =>
    request<{ message: string; dev_otp?: string }>("/auth/forgot-password", { method: "POST", body: { email }, auth: false }),
  resetPassword: (email: string, code: string, newPassword: string) =>
    request<{ message: string }>("/auth/reset-password", {
      method: "POST", body: { email, code, new_password: newPassword }, auth: false,
    }),
  me: () => request<User>("/auth/me"),
  /** Revoke a session that was never stored (e.g. refused at the staff door). */
  revokeRefresh: (refreshToken: string) =>
    request("/auth/logout", { method: "POST", body: { refresh_token: refreshToken }, auth: false }).catch(() => {}),
  async logout() {
    const refresh = tokens.refresh;
    if (refresh) {
      try {
        await request("/auth/logout", { method: "POST", body: { refresh_token: refresh }, auth: false });
      } catch { /* the local session is cleared regardless */ }
    }
    tokens.clear();
  },

  // account
  updateProfile: (payload: Record<string, unknown>) =>
    request<User>("/account/profile", { method: "PATCH", body: payload }),
  changePassword: (current: string, next: string) =>
    request<{ message: string }>("/account/change-password", {
      method: "POST", body: { current_password: current, new_password: next },
    }),
  listSessions: () => request<Array<Record<string, unknown>>>("/account/sessions"),
  revokeSession: (id: string) => request(`/account/sessions/${enc(id)}`, { method: "DELETE" }),
  revokeAllSessions: () => request("/account/sessions/revoke-all", { method: "POST" }),
  deleteAccount: (password: string) =>
    request("/account/", { method: "DELETE", body: { password, confirm: "DELETE" } }),
  uploadAvatar(file: File) {
    const form = new FormData();
    form.append("file", file);
    return request<User>("/account/avatar", { method: "POST", body: form, isForm: true });
  },
  removeAvatar: () => request<User>("/account/avatar", { method: "DELETE" }),

  // documents
  uploadDocument(file: File, onProgress?: (pct: number) => void): Promise<DocumentInfo> {
    // XHR rather than fetch, because upload progress needs it.
    return new Promise((resolve, reject) => {
      const form = new FormData();
      form.append("file", file);
      const xhr = new XMLHttpRequest();
      xhr.open("POST", `${API_BASE}/lessons/documents`);
      if (tokens.access) xhr.setRequestHeader("Authorization", `Bearer ${tokens.access}`);
      xhr.upload.onprogress = (e) => {
        if (onProgress && e.lengthComputable) onProgress(Math.round((e.loaded / e.total) * 100));
      };
      xhr.onload = () => {
        let data: unknown = null;
        try { data = JSON.parse(xhr.responseText); } catch { /* handled below */ }
        if (xhr.status >= 200 && xhr.status < 300) resolve(data as DocumentInfo);
        else reject(new ApiError(messageFor(xhr.status, data), xhr.status, data));
      };
      xhr.onerror = () => reject(new ApiError(messageFor(0, null), 0, null));
      xhr.send(form);
    });
  },
  listDocuments: () => request<DocumentInfo[]>("/lessons/documents"),
  deleteDocument: (id: string) => request(`/lessons/documents/${enc(id)}`, { method: "DELETE" }),

  // lessons
  createLesson: (payload: Record<string, unknown>) =>
    request<{ lesson_id: string; title: string }>("/lessons", { method: "POST", body: payload }),
  generatePlan: (id: string) =>
    request<{ plan: { nodes: Array<Record<string, unknown>> }; detail?: LessonDetail }>(`/lessons/${enc(id)}/plan`, { method: "POST" }),
  getLesson: (id: string) => request<LessonDetail>(`/lessons/${enc(id)}`),
  deleteLesson: (id: string) => request(`/lessons/${enc(id)}`, { method: "DELETE" }),
  listLessons(params: Record<string, string | number | undefined> = {}) {
    const q = new URLSearchParams(
      Object.entries(params).filter(([, v]) => v !== undefined && v !== "").map(([k, v]) => [k, String(v)])
    ).toString();
    return request<LessonList>(`/lessons${q ? `?${q}` : ""}`);
  },
  getWsTicket: (id: string) =>
    request<{ ticket: string; ws_path: string; expires_in: number }>(`/lessons/${enc(id)}/ticket`, { method: "POST" }),
  continueLesson: (id: string) => request<LessonDetail>(`/lessons/${enc(id)}/continue`, { method: "POST" }),
  skipConcept: (id: string) => request<LessonDetail>(`/lessons/${enc(id)}/skip`, { method: "POST" }),
  relearnConcept: (id: string, nodeId: string) =>
    request<LessonDetail>(`/lessons/${enc(id)}/nodes/${enc(nodeId)}/relearn`, { method: "POST" }),
  practice: (id: string) => request<PracticeSet>(`/lessons/${enc(id)}/practice`),
  generatePractice: (id: string) => request<PracticeSet>(`/lessons/${enc(id)}/practice/generate`, { method: "POST" }),
  answerPractice: (id: string, interactionId: string, answer: string) =>
    request<PracticeResult>(`/lessons/${enc(id)}/practice/${enc(interactionId)}`, {
      method: "POST", body: { answer },
    }),
  lessonNotes: (id: string) => request<{ lesson_id: string; title: string; notes: SavedNote[] }>(`/lessons/${enc(id)}/notes`),
  async notesMarkdown(id: string): Promise<Blob> {
    const res = await fetch(`${API_BASE}/lessons/${enc(id)}/notes?format=markdown&download=true`, {
      headers: tokens.access ? { Authorization: `Bearer ${tokens.access}` } : {},
    });
    if (!res.ok) throw new ApiError("notes", res.status, null);
    return res.blob();
  },

  // insights
  dashboard: () => request<Dashboard>("/dashboard"),
  skillMap: (goal?: string | null) => request<SkillMap>(`/skill-map${goal ? `?goal=${enc(goal)}` : ""}`),
  setSkillGoal: (goal: string | null) => request<SkillMap>("/skill-map/goal", { method: "PATCH", body: { goal } }),
  reviewDue: () => request<{ due: ReviewDue[] }>("/spaced-review"),
  reviewStart: (cid: string) => request<ReviewSet>(`/spaced-review/${enc(cid)}/start`, { method: "POST" }),
  reviewAnswer: (cid: string, questionId: string, answer: string) =>
    request<ReviewResult>(`/spaced-review/${enc(cid)}/answer`, { method: "POST", body: { question_id: questionId, answer } }),
  lessonWhy: (id: string) => request<{ lesson_id: string; entries: WhyEntry[] }>(`/lessons/${enc(id)}/why`),
  placementNext: (answers: PlacementAnswer[]) =>
    request<PlacementStep>("/skill-map/placement/next", { method: "POST", body: { answers } }),
  placementSave: (answers: PlacementAnswer[]) =>
    request<{ placement: Placement; map: SkillMap }>("/skill-map/placement", { method: "POST", body: { answers } }),
  placementReset: () => request<SkillMap>("/skill-map/placement", { method: "DELETE" }),
  addSkillConcept: (topic: string) =>
    request<SkillConcept & { existing: boolean }>("/skill-map/concepts", { method: "POST", body: { topic } }),
  analytics: () => request<Analytics>("/analytics"),
  journey: () => request<Journey>("/journey"),

  /** Owner-scoped media needs the Authorization header, so it is fetched as a blob. */
  async mediaObjectUrl(url: string): Promise<string> {
    const res = await fetch(url.startsWith("http") ? url : `${BACKEND_ORIGIN}${url}`, {
      headers: tokens.access ? { Authorization: `Bearer ${tokens.access}` } : {},
    });
    if (!res.ok) throw new ApiError("video", res.status, null);
    return URL.createObjectURL(await res.blob());
  },

  // board syllabus path
  boards: () => request<BoardsInfo>("/curriculum/boards", { auth: false }),
  syllabus: () => request<SyllabusPath>("/curriculum/path"),
  topicStart: (id: string) => request(`/curriculum/topics/${enc(id)}/start`, { method: "POST" }),
  topicComplete: (id: string, done = true) => request(`/curriculum/topics/${enc(id)}/complete`, { method: "POST", body: { done } }),
  myTeachers: () => request<MyTeachers>("/curriculum/my-teachers"),

  // doubts & chat
  doubts: (params: DoubtQuery = {}) => {
    const q = new URLSearchParams(Object.entries(params).filter(([, v]) => v !== undefined && v !== "").map(([k, v]) => [k, String(v)])).toString();
    return request<{ threads: DoubtThread[]; total: number; limit: number; offset: number }>(`/doubts${q ? `?${q}` : ""}`);
  },
  doubtStats: () => request<DoubtStats>("/doubts/stats"),
  bulkReply: (payload: { thread_ids: string[]; body?: string; kind: "text" | "live"; scheduled_at?: string; duration_min?: number }) =>
    request<{ updated: number }>("/doubts/bulk", { method: "POST", body: payload }),
  doubt: (id: string) => request<DoubtThread>(`/doubts/${enc(id)}`),
  askDoubt: (payload: { question: string; lesson_id?: string; node_id?: string; subject?: string; topic?: string; concept?: string; lang?: string }) =>
    request<DoubtThread>("/doubts", { method: "POST", body: payload }),
  doubtMessage: (id: string, body: string, lang = "en") => request<DoubtThread>(`/doubts/${enc(id)}/messages`, { method: "POST", body: { body, lang } }),
  doubtConfused: (id: string, lang = "en") => request<DoubtThread>(`/doubts/${enc(id)}/confused?lang=${enc(lang)}`, { method: "POST" }),
  doubtUnderstood: (id: string) => request<DoubtThread>(`/doubts/${enc(id)}/understood`, { method: "POST" }),
  doubtEscalate: (id: string) => request<DoubtThread>(`/doubts/${enc(id)}/escalate`, { method: "POST" }),
  doubtNotes(id: string, body: string, file?: File | null) {
    const form = new FormData();
    form.append("body", body);
    if (file) form.append("file", file);
    return request<DoubtThread>(`/doubts/${enc(id)}/notes`, { method: "POST", body: form, isForm: true });
  },
  doubtVideo(id: string, body: string, file: File) {
    const form = new FormData();
    form.append("body", body);
    form.append("file", file);
    return request<DoubtThread>(`/doubts/${enc(id)}/video`, { method: "POST", body: form, isForm: true });
  },
  doubtLive: (id: string, scheduled_at: string, note: string, duration_min = 30) =>
    request<DoubtThread>(`/doubts/${enc(id)}/live`, { method: "POST", body: { scheduled_at, note, duration_min } }),
  openChat: (withId: string) => request<DoubtThread>("/doubts/chat", { method: "POST", body: { with_id: withId } }),
  /** <video>/<a> can't send headers; the API also accepts the access token as ?token=. */
  doubtMediaUrl: (messageId: string) => `${API_BASE}/doubts/media/${enc(messageId)}?token=${enc(tokens.access ?? "")}`,

  // tests & leaderboards
  tests: () => request<{ tests: ClassTest[] }>("/tests"),
  test: (id: string) => request<ClassTest>(`/tests/${enc(id)}`),
  createTest: (payload: Record<string, unknown>) => request<ClassTest>("/tests", { method: "POST", body: payload }),
  deleteTest: (id: string) => request(`/tests/${enc(id)}`, { method: "DELETE" }),
  submitTest: (id: string, answers: Record<string, number[]>, time_taken_sec: number) =>
    request<StudentTestReport>(`/tests/${enc(id)}/submit`, { method: "POST", body: { answers, time_taken_sec } }),
  testLeaderboard: (id: string) => request<TestBoard>(`/tests/${enc(id)}/leaderboard`),
  testReport: <T = StudentTestReport | TeacherTestReport>(id: string) => request<T>(`/tests/${enc(id)}/report`),

  // games
  gameScore: (payload: { subject: string; topic: string; game: string; correct: number; total: number; streak: number }) =>
    request<{ points: number; total_points: number }>("/games/score", { method: "POST", body: payload }),
  classLeaderboard: (subject?: string) => request<GameBoard>(`/games/leaderboard${subject ? `?subject=${enc(subject)}` : ""}`),
  testsClassLeaderboard: (subject?: string) =>
    request<{ rows: LeaderRow[]; me: LeaderRow | null; tests: number }>(`/tests/leaderboard/class${subject ? `?subject=${enc(subject)}` : ""}`),
  gameJourney: (subject: string) => request<Journey2>(`/games/journey?subject=${enc(subject)}`),
  journeyComplete: (payload: { subject: string; topic_id: string; correct: number; total: number; hearts_left: number; hints_used: number }) =>
    request<{ stars: number; cleared: boolean; points: number; coins: number; next: JourneyStage | null; journey: Journey2 }>("/games/journey/complete", { method: "POST", body: payload }),
  spendCoins: (coins: number, reason = "hint") => request<{ coins: number }>("/games/spend", { method: "POST", body: { coins, reason } }),
  wallet: () => request<{ coins: number }>("/games/wallet"),

  // notifications & help bot
  notifications: () => request<{ unread: number; items: AppNotification[] }>("/notifications"),
  markRead: (ids?: string[]) => request("/notifications/read", { method: "POST", body: { ids: ids ?? null } }),
  removeNotification: (id: string) => request(`/notifications/${enc(id)}`, { method: "DELETE" }),
  clearNotifications: (readOnly = true) => request<{ removed: number }>(`/notifications?read_only=${readOnly}`, { method: "DELETE" }),
  helpChat: (message: string, lang: string, page?: string) =>
    request<{ reply: string; link: string | null; label: string | null }>("/help/chat", { method: "POST", body: { message, lang, page } }),

  // teacher desk
  teacher: {
    profile: () => request<{ teaching: Teaching[]; class_teacher_of: string[] }>("/teacher/profile"),
    setProfile: (teaching: Teaching[], class_teacher_of: string[]) =>
      request<{ teaching: Teaching[]; class_teacher_of: string[] }>("/teacher/profile", { method: "PUT", body: { teaching, class_teacher_of } }),
    overview: () => request<TeacherOverview>("/teacher/overview"),
    students: (params: Record<string, string | number | undefined> = {}) => {
      const q = new URLSearchParams(Object.entries(params).filter(([, v]) => v !== undefined && v !== "").map(([k, v]) => [k, String(v)])).toString();
      return request<TeacherStudents>(`/teacher/students${q ? `?${q}` : ""}`);
    },
    student: (id: string) => request<TeacherStudentDetail>(`/teacher/students/${enc(id)}`),
    directory: () => request<{ teachers: Array<import("./types").Person & { teaching: Teaching[]; class_teacher_of: string[]; students: number; mentees: number }> }>("/teacher/directory"),
    setMentor: (studentId: string, teacherId: string) =>
      request(`/teacher/students/${enc(studentId)}/mentor`, { method: "PATCH", body: { teacher_id: teacherId } }),
  },

  // admin
  admin: {
    overview: (days = 14) => request<AdminOverview>(`/admin/overview?days=${days}`),
    live: () => request<AdminLive>("/admin/live"),
    escalations: (status?: string) =>
      request<AdminEscalations>(`/admin/escalations${status ? `?status=${enc(status)}` : ""}`),
    insights: () => request<AdminInsights>("/admin/insights"),
    quality: () => request<AdminQuality>("/admin/quality"),
    pipeline: () => request<AdminPipeline>("/admin/pipeline"),
    learners: (q = "") => request<AdminLearners>(`/admin/learners${q ? `?q=${enc(q)}` : ""}`),
    staff: (q = "") => request<AdminStaff>(`/admin/staff${q ? `?q=${enc(q)}` : ""}`),
    learner: (id: string) => request<AdminLearnerDetail>(`/admin/learners/${enc(id)}`),
  },
};

export function wsUrl(wsPath: string, ticket: string): string {
  const backend = new URL(BACKEND_ORIGIN);
  const scheme = backend.protocol === "https:" ? "wss" : "ws";
  return `${scheme}://${backend.host}${wsPath}?ticket=${enc(ticket)}`;
}

export type { Lesson };
