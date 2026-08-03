import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

interface GradientOrbProps {
  className?: string;
  size?: number;
}

export function GradientOrb({ className, size = 112 }: GradientOrbProps) {
  return (
    <motion.div
      className={cn("relative mx-auto", className)}
      style={{ width: size, height: size }}
      initial={{ scale: 0.92, y: 6 }}
      animate={{ scale: 1, y: 0 }}
      transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
    >
      <div
        className="absolute inset-[-28%] rounded-full opacity-70 blur-2xl"
        style={{
          background:
            "radial-gradient(circle at 40% 35%, rgba(15,23,42,0.16), rgba(15,23,42,0.04) 45%, transparent 70%)",
        }}
      />
      <motion.div
        className="absolute inset-0 rounded-full shadow-[0_18px_40px_rgba(15,23,42,0.14)]"
        style={{
            background:
              "radial-gradient(circle at 32% 28%, #ffffff 0%, #f6f6f7 32%, #d4d4d8 66%, #71717a 100%)",
        }}
        animate={{ y: [0, -6, 0] }}
        transition={{ duration: 4.5, repeat: Infinity, ease: "easeInOut" }}
      >
        <div
          className="absolute inset-[14%] rounded-full opacity-80"
          style={{
              background:
              "radial-gradient(circle at 35% 30%, rgba(255,255,255,0.95), rgba(255,255,255,0.15) 55%, transparent 70%)",
          }}
        />
        <div
          className="absolute bottom-[18%] left-[20%] right-[20%] h-[18%] rounded-full opacity-40 blur-md"
          style={{
            background:
              "linear-gradient(90deg, transparent, rgba(249,115,22,0.32), transparent)",
          }}
        />
      </motion.div>
    </motion.div>
  );
}
