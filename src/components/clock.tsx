import { useEffect, useState, memo } from "react";

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

  const text = isMounted ? currentTime : "Loading...";

  if (inline) {
    return (
      <span className="text-nowrap font-light" suppressHydrationWarning>
        {text}
      </span>
    );
  }

  return (
    <div className="font-light text-center my-1">
      <p
        className="text-nowrap type-body-sm text-[var(--text-secondary)]"
        suppressHydrationWarning={true}
      >
        {text}
      </p>
    </div>
  );
});

export default Clock;
