import { Navbar } from "./components/Navbar";
import { Hero } from "./components/Hero";
import { Foundation } from "./components/Foundation";
import { Tools } from "./components/Tools";
import { Architecture } from "./components/Architecture";
import { Values } from "./components/Values";
import { Industries } from "./components/Industries";
import { Connect } from "./components/Connect";
import { Footer } from "./components/Footer";

/* ── App ── */
export default function App() {
  return (
    <div className="min-h-screen bg-[hsl(var(--bg))]">
      <Navbar />
      <Hero />
      <Foundation />
      <Tools />
      <Architecture />
      <Values />
      <Industries />
      <Connect />
      <Footer />
    </div>
  );
}
