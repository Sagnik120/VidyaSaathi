/** Demo accounts seeded by the backend (modules/backend/src/db/base.py). */
export const DEMO_PASSWORD = "DemoStudent@123";

export const DEMO_STUDENT = { email: "demo@vidyasaathi.in", label: "CBSE · Class 9" };
export const DEMO_ADMIN = { email: "admin@vidyasaathi.in" };

/** One demo teacher per subject; each teaches it in Classes 6–10 on every board that has it. */
export const DEMO_TEACHERS: Array<{ subject: string; hi: string; email: string; name: string; boards: string; emoji: string }> = [
  { subject: "Mathematics", hi: "गणित", email: "teacher@vidyasaathi.in", name: "Meera Iyer", boards: "CBSE · ICSE", emoji: "📐" },
  { subject: "Science", hi: "विज्ञान", email: "science.teacher@vidyasaathi.in", name: "Arjun Rao", boards: "CBSE", emoji: "🔬" },
  { subject: "Social Science", hi: "सामाजिक विज्ञान", email: "sst.teacher@vidyasaathi.in", name: "Kavita Sharma", boards: "CBSE", emoji: "🗺️" },
  { subject: "English", hi: "अंग्रेज़ी", email: "english.teacher@vidyasaathi.in", name: "Rahul Mehta", boards: "CBSE · ICSE", emoji: "📖" },
  { subject: "Physics", hi: "भौतिकी", email: "physics.teacher@vidyasaathi.in", name: "Neha Gupta", boards: "ICSE", emoji: "⚡" },
  { subject: "Chemistry", hi: "रसायन", email: "chemistry.teacher@vidyasaathi.in", name: "Imran Khan", boards: "ICSE", emoji: "⚗️" },
  { subject: "Biology", hi: "जीव विज्ञान", email: "biology.teacher@vidyasaathi.in", name: "Priya Nair", boards: "ICSE", emoji: "🌿" },
  { subject: "History & Civics", hi: "इतिहास और नागरिक शास्त्र", email: "history.teacher@vidyasaathi.in", name: "Vikram Singh", boards: "ICSE", emoji: "🏛️" },
  { subject: "Geography", hi: "भूगोल", email: "geography.teacher@vidyasaathi.in", name: "Ananya Das", boards: "ICSE", emoji: "🌏" },
];
