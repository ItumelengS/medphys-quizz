import Link from "next/link";

const features = [
  {
    icon: "🧠",
    title: "4,000+ Questions",
    description:
      "Comprehensive coverage across radiation therapy, diagnostic radiology, nuclear medicine, and health physics.",
  },
  {
    icon: "🏆",
    title: "Daily Challenges",
    description:
      "Test yourself every day with timed quizzes. Build streaks and climb the leaderboard.",
  },
  {
    icon: "⚔️",
    title: "Arena Tournaments",
    description:
      "Compete in Blitz, Rapid, and Marathon formats against other medical physics professionals.",
  },
  {
    icon: "🔄",
    title: "Spaced Repetition",
    description:
      "Smart review system that brings back questions you need to practice most.",
  },
  {
    icon: "🎮",
    title: "Game Modes",
    description:
      "Sudden Death, Sprint, Crossword, Hot Seat — learn through varied game formats.",
  },
  {
    icon: "📊",
    title: "Track Progress",
    description:
      "XP system, career levels, section mastery rings, and detailed performance stats.",
  },
];

const topics = [
  "Radiation Therapy Physics",
  "Diagnostic Radiology",
  "Nuclear Medicine",
  "Health Physics & Radiation Protection",
  "Anatomy & Physiology",
  "Radiation Biology",
  "Dosimetry",
  "Brachytherapy",
  "IMRT & VMAT",
  "IGRT & Adaptive Radiotherapy",
];

export default function LandingPage() {
  return (
    <main className="min-h-dvh pb-12 px-4 pt-8 max-w-2xl mx-auto">
      {/* Hero */}
      <section className="mb-12 text-center">
        <h1 className="text-4xl sm:text-5xl font-black mb-3">
          <span className="text-bauhaus-blue">MedPhys</span>{" "}
          <span className="text-text-primary">Speed Quiz</span>
        </h1>
        <div className="w-16 h-1 bg-bauhaus-yellow mx-auto mb-4" />
        <p className="text-text-secondary text-lg font-light max-w-md mx-auto mb-6">
          The free quiz platform for medical physics professionals and students.
          4,000+ questions to sharpen your knowledge and prepare for board exams.
        </p>
        <div className="flex gap-3 justify-center">
          <Link
            href="/login/register"
            className="px-6 py-3 bg-bauhaus-blue text-white font-bold text-sm uppercase tracking-wider hover:opacity-90 transition-opacity"
          >
            Get Started Free
          </Link>
          <Link
            href="/login"
            className="px-6 py-3 border-2 border-bauhaus-blue text-bauhaus-blue font-bold text-sm uppercase tracking-wider hover:bg-bauhaus-blue/10 transition-colors"
          >
            Sign In
          </Link>
        </div>
      </section>

      {/* Features */}
      <section className="mb-12">
        <h2 className="text-2xl font-black text-text-primary mb-6 text-center uppercase tracking-wider">
          Why MedPhys Speed Quiz?
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {features.map((feature) => (
            <div
              key={feature.title}
              className="p-4 border-2 border-surface-border border-l-4 border-l-bauhaus-blue"
            >
              <div className="flex items-center gap-2 mb-2">
                <span className="text-xl">{feature.icon}</span>
                <h3 className="font-bold text-sm text-text-primary">
                  {feature.title}
                </h3>
              </div>
              <p className="text-text-secondary text-xs font-light">
                {feature.description}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* Topics */}
      <section className="mb-12">
        <h2 className="text-2xl font-black text-text-primary mb-6 text-center uppercase tracking-wider">
          Topics Covered
        </h2>
        <div className="grid grid-cols-2 gap-2">
          {topics.map((topic) => (
            <div
              key={topic}
              className="p-3 border-2 border-surface-border text-sm font-medium text-text-secondary"
            >
              {topic}
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="text-center border-2 border-bauhaus-yellow/30 p-8 mb-8" style={{ background: "rgba(234, 179, 8, 0.05)" }}>
        <h2 className="text-xl font-black text-text-primary mb-2">
          Ready to test your knowledge?
        </h2>
        <p className="text-text-secondary text-sm font-light mb-4">
          Join medical physicists from around the world. Free to use, no credit card required.
        </p>
        <Link
          href="/login/register"
          className="inline-block px-8 py-3 bg-bauhaus-yellow text-black font-bold text-sm uppercase tracking-wider hover:opacity-90 transition-opacity"
        >
          Start Quizzing
        </Link>
      </section>

      {/* Footer text for SEO */}
      <footer className="text-center text-text-dim text-xs font-light">
        <p>
          MedPhys Speed Quiz is a free educational tool for medical physics
          exam preparation. Covering topics for ABR, CAMPEP, and international
          medical physics certifications.
        </p>
      </footer>
    </main>
  );
}
