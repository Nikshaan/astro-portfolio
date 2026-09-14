import { useEffect, useState, memo } from "react";
import { Placeholder } from "./Placeholder";

interface ClockProps {
  inline?: boolean;
}

const Clock = memo(function Clock({ inline = false }: ClockProps) {
  const [currentTime, setCurrentTime] = useState<string>("");
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);

    const updateTime = () => {
      const currentIST = new Date().toLocaleString("en-IN", {
        timeZone: "Asia/Kolkata",
        timeStyle: "medium",
      });
      setCurrentTime(currentIST);
    };

    updateTime();

    const timer = setInterval(() => {
      updateTime();
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  if (!isMounted) {
    const skel = (
      <Placeholder
        as="span"
        className="inline-block h-[1lh] w-[11ch] align-baseline rounded-sm"
      />
    );
    if (inline) return skel;
    return (
      <div className="font-light text-center my-1">
        <p className="text-nowrap type-body-sm">{skel}</p>
      </div>
    );
  }

  if (inline) {
    return (
      <span className="text-nowrap font-light" suppressHydrationWarning>
        {currentTime}
      </span>
    );
  }

  return (
    <div className="font-light text-center my-1">
      <p
        className="text-nowrap type-body-sm text-[var(--text-secondary)]"
        suppressHydrationWarning={true}
      >
        {currentTime}
      </p>
    </div>
  );
});

export default Clock;
